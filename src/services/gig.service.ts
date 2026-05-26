import { Effect } from "effect";
import { prisma } from "../lib/prisma";
import { DatabaseError, NotFoundError, ForbiddenError } from "../shared/errors";

export const createGig = (bandId: string, name: string, date: string, venue: string | undefined, userId: string) =>
  Effect.gen(function* () {
    const membership = yield* Effect.tryPromise({
      try: () =>
        prisma.bandMember.findUnique({
          where: { userId_bandId: { userId, bandId } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!membership) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    const gig = yield* Effect.tryPromise({
      try: () =>
        prisma.gig.create({
          data: { name, date: new Date(date), venue, bandId },
          include: { band: { select: { id: true, name: true } } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return gig;
  });

export const getBandGigs = (bandId: string, userId: string) =>
  Effect.gen(function* () {
    const membership = yield* Effect.tryPromise({
      try: () =>
        prisma.bandMember.findUnique({
          where: { userId_bandId: { userId, bandId } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!membership) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    const gigs = yield* Effect.tryPromise({
      try: () =>
        prisma.gig.findMany({
          where: { bandId },
          include: {
            _count: { select: { songs: true } },
          },
          orderBy: { date: "asc" },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return gigs;
  });

export const getGigById = (gigId: string, userId: string) =>
  Effect.gen(function* () {
    const gig = yield* Effect.tryPromise({
      try: () =>
        prisma.gig.findUnique({
          where: { id: gigId },
          include: {
            band: {
              include: {
                members: { select: { userId: true } },
              },
            },
            songs: {
              include: {
                addedBy: { select: { id: true, username: true } },
                voteRecords: { select: { userId: true, value: true } },
              },
              orderBy: [
                { setlistOrder: { sort: "asc", nulls: "last" } },
                { votes: "desc" },
              ],
            },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!gig) {
      return yield* Effect.fail(new NotFoundError("Gig not found"));
    }

    const isMember = gig.band.members.some((m) => m.userId === userId);
    if (!isMember) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    const { band, ...gigData } = gig;
    return { ...gigData, bandId: band.id, bandName: band.name };
  });
