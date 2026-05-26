import { Effect } from "effect";
import { prisma } from "../lib/prisma";
import { DatabaseError, NotFoundError, ForbiddenError, ValidationError } from "../shared/errors";

/** Verify user is a member of the band that owns the given gig */
const verifyGigMembership = (gigId: string, userId: string) =>
  Effect.gen(function* () {
    const gig = yield* Effect.tryPromise({
      try: () =>
        prisma.gig.findUnique({
          where: { id: gigId },
          include: {
            band: {
              include: { members: { select: { userId: true, role: true } } },
            },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!gig) {
      return yield* Effect.fail(new NotFoundError("Gig not found"));
    }

    const member = gig.band.members.find((m) => m.userId === userId);
    if (!member) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    return { gig, role: member.role };
  });

export const addSong = (
  gigId: string,
  title: string,
  artist: string,
  userId: string,
  bpm?: number,
  key?: string
) =>
  Effect.gen(function* () {
    yield* verifyGigMembership(gigId, userId);

    const song = yield* Effect.tryPromise({
      try: () =>
        prisma.song.create({
          data: { title, artist, bpm, key, gigId, addedById: userId },
          include: {
            addedBy: { select: { id: true, username: true } },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return song;
  });

export const removeSong = (songId: string, userId: string) =>
  Effect.gen(function* () {
    const song = yield* Effect.tryPromise({
      try: () =>
        prisma.song.findUnique({
          where: { id: songId },
          include: {
            gig: {
              include: {
                band: {
                  include: { members: { select: { userId: true, role: true } } },
                },
              },
            },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!song) {
      return yield* Effect.fail(new NotFoundError("Song not found"));
    }

    const member = song.gig.band.members.find((m) => m.userId === userId);
    if (!member) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    const isCreator = song.addedById === userId;
    const isAdmin = member.role === "ADMIN";

    if (!isCreator && !isAdmin) {
      return yield* Effect.fail(new ForbiddenError("Only the song creator or a band admin can remove songs"));
    }

    yield* Effect.tryPromise({
      try: () => prisma.song.delete({ where: { id: songId } }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return { id: songId, gigId: song.gigId };
  });

export const voteSong = (songId: string, userId: string, value: number) =>
  Effect.gen(function* () {
    if (value !== 1 && value !== -1) {
      return yield* Effect.fail(new ValidationError("Vote value must be 1 or -1"));
    }

    const song = yield* Effect.tryPromise({
      try: () =>
        prisma.song.findUnique({
          where: { id: songId },
          include: {
            gig: {
              include: {
                band: { include: { members: { select: { userId: true } } } },
              },
            },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!song) {
      return yield* Effect.fail(new NotFoundError("Song not found"));
    }

    const isMember = song.gig.band.members.some((m) => m.userId === userId);
    if (!isMember) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    const existingVote = yield* Effect.tryPromise({
      try: () =>
        prisma.vote.findUnique({
          where: { userId_songId: { userId, songId } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    const result = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction(async (tx) => {
          if (existingVote) {
            if (existingVote.value === value) {
              // Same vote again removes it
              await tx.vote.delete({ where: { id: existingVote.id } });
              await tx.song.update({
                where: { id: songId },
                data: { votes: { decrement: value } },
              });
            } else {
              // Flip the vote
              await tx.vote.update({
                where: { id: existingVote.id },
                data: { value },
              });
              await tx.song.update({
                where: { id: songId },
                data: { votes: { increment: value * 2 } },
              });
            }
          } else {
            await tx.vote.create({ data: { value, userId, songId } });
            await tx.song.update({
              where: { id: songId },
              data: { votes: { increment: value } },
            });
          }

          return tx.song.findUniqueOrThrow({
            where: { id: songId },
            include: {
              addedBy: { select: { id: true, username: true } },
              voteRecords: { select: { userId: true, value: true } },
            },
          });
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return result;
  });

export const updateSetlistOrder = (gigId: string, songIds: string[], userId: string) =>
  Effect.gen(function* () {
    yield* verifyGigMembership(gigId, userId);

    const songs = yield* Effect.tryPromise({
      try: () =>
        prisma.song.findMany({
          where: { gigId },
          select: { id: true },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    const gigSongIds = new Set(songs.map((s) => s.id));
    const invalidIds = songIds.filter((id) => !gigSongIds.has(id));

    if (invalidIds.length > 0) {
      return yield* Effect.fail(new NotFoundError(`Songs not found in this gig: ${invalidIds.join(", ")}`));
    }

    const result = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction(async (tx) => {
          // Clear all setlist positions
          await tx.song.updateMany({
            where: { gigId },
            data: { setlistOrder: null },
          });

          // Set new positions for ordered songs
          for (let i = 0; i < songIds.length; i++) {
            await tx.song.update({
              where: { id: songIds[i] },
              data: { setlistOrder: i + 1 },
            });
          }

          return tx.song.findMany({
            where: { gigId },
            include: {
              addedBy: { select: { id: true, username: true } },
              voteRecords: { select: { userId: true, value: true } },
            },
            orderBy: [
              { setlistOrder: { sort: "asc", nulls: "last" } },
              { votes: "desc" },
            ],
          });
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return result;
  });
