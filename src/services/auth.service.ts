import { Effect } from "effect";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { DatabaseError, ConflictError, UnauthorizedError } from "../shared/errors";

function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, env.JWT_SECRET, { expiresIn: "7d" });
}

export const register = (username: string, password: string) =>
  Effect.gen(function* () {
    const existing = yield* Effect.tryPromise({
      try: () => prisma.user.findUnique({ where: { username } }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (existing) {
      return yield* Effect.fail(new ConflictError("Username already taken"));
    }

    const passwordHash = yield* Effect.tryPromise({
      try: () => bcrypt.hash(password, 10),
      catch: (error) => new DatabaseError(String(error)),
    });

    const user = yield* Effect.tryPromise({
      try: () =>
        prisma.user.create({
          data: { username, passwordHash },
          select: { id: true, username: true, createdAt: true },
        }),
      catch: (error) => new DatabaseError(String(error)),
    });

    const token = generateToken(user.id, user.username);

    return { user, token };
  });

export const login = (username: string, password: string) =>
  Effect.gen(function* () {
    const user = yield* Effect.tryPromise({
      try: () => prisma.user.findUnique({ where: { username } }),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!user) {
      return yield* Effect.fail(new UnauthorizedError("Invalid username or password"));
    }

    const valid = yield* Effect.tryPromise({
      try: () => bcrypt.compare(password, user.passwordHash),
      catch: (error) => new DatabaseError(String(error)),
    });

    if (!valid) {
      return yield* Effect.fail(new UnauthorizedError("Invalid username or password"));
    }

    const token = generateToken(user.id, user.username);

    return {
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
      token,
    };
  });
