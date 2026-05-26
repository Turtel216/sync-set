import { Effect } from "effect";
import { Response } from "express";

/** Map Effect error _tag values to HTTP status codes */
const ERROR_STATUS_MAP: Record<string, number> = {
  NotFoundError: 404,
  ForbiddenError: 403,
  UnauthorizedError: 401,
  InvalidCredentialsError: 401,
  UserExistsError: 409,
  AlreadyMemberError: 409,
  InvalidVoteError: 400,
  DatabaseError: 500,
};

/** Execute an Effect and send the result as a JSON response */
export function runEffect<A, E extends { _tag: string; message: string }>(
  res: Response,
  effect: Effect.Effect<A, E>,
  successStatus = 200
): void {
  Effect.runPromise(effect).then(
    (result) => {
      res.status(successStatus).json(result);
    },
    (error: any) => {
      const status = ERROR_STATUS_MAP[error._tag] || 500;
      const message = status === 500 ? "Internal server error" : error.message;
      res.status(status).json({ error: message });
    }
  );
}
