import { Effect } from "effect";
import { prisma } from "../lib/prisma";
import { DatabaseError, NotFoundError, ForbiddenError, ConflictError } from "../shared/errors";

export const createBand = (name: string, userId: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.band.create({
        data: {
          name,
          members: {
            create: { userId, role: "ADMIN" },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } },
          },
        },
      }),
    catch: (error) => new DatabaseError(String(error)),
  });

export const getUserBands = (userId: string) =>
  Effect.tryPromise({
    try: () =>
      prisma.band.findMany({
        where: { members: { some: { userId } } },
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } },
          },
          _count: { select: { gigs: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    catch: (error) => new DatabaseError(String(error)),
  });

export const getBandById = (bandId: string, userId: string) =>
  Effect.gen(function* () {
    const band = yield* Effect.tryPromise({
      try: () =>
        prisma.band.findUnique({
          where: { id: bandId },
          include: {
            members: {
              include: { user: { select: { id: true, username: true } } },
            },
            gigs: { orderBy: { date: "asc" } },
          },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!band) {
      return yield* Effect.fail(new NotFoundError("Band not found"));
    }

    const isMember = band.members.some((m) => m.userId === userId);
    if (!isMember) {
      return yield* Effect.fail(new ForbiddenError("You are not a member of this band"));
    }

    return band;
  });

export const addMember = (bandId: string, targetUsername: string, requestingUserId: string) =>
  Effect.gen(function* () {
    const membership = yield* Effect.tryPromise({
      try: () =>
        prisma.bandMember.findFirst({
          where: { bandId, userId: requestingUserId },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!membership || membership.role !== "ADMIN") {
      return yield* Effect.fail(new ForbiddenError("Only band admins can add members"));
    }

    const targetUser = yield* Effect.tryPromise({
      try: () => prisma.user.findUnique({ where: { username: targetUsername } }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!targetUser) {
      return yield* Effect.fail(new NotFoundError("User not found"));
    }

    const existingMembership = yield* Effect.tryPromise({
      try: () =>
        prisma.bandMember.findUnique({
          where: { userId_bandId: { userId: targetUser.id, bandId } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (existingMembership) {
      return yield* Effect.fail(new ConflictError("User is already a member of this band"));
    }

    const newMember = yield* Effect.tryPromise({
      try: () =>
        prisma.bandMember.create({
          data: { userId: targetUser.id, bandId, role: "MEMBER" },
          include: { user: { select: { id: true, username: true } } },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    return newMember;
  });
