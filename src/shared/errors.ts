/** Typed error classes for the Effect service layer */

export class DatabaseError {
  readonly _tag = "DatabaseError" as const;
  constructor(readonly message: string) {}
}

export class NotFoundError {
  readonly _tag = "NotFoundError" as const;
  constructor(readonly message: string) {}
}

export class ForbiddenError {
  readonly _tag = "ForbiddenError" as const;
  constructor(readonly message: string) {}
}

export class UnauthorizedError {
  readonly _tag = "UnauthorizedError" as const;
  constructor(readonly message: string) {}
}

export class ConflictError {
  readonly _tag = "ConflictError" as const;
  constructor(readonly message: string) {}
}

export class ValidationError {
  readonly _tag = "ValidationError" as const;
  constructor(readonly message: string) {}
}

export type AppError =
  | DatabaseError
  | NotFoundError
  | ForbiddenError
  | UnauthorizedError
  | ConflictError
  | ValidationError;

/** Maps a tagged error to an HTTP status code */
export function errorToStatus(error: AppError): number {
  switch (error._tag) {
    case "NotFoundError":
      return 404;
    case "ForbiddenError":
      return 403;
    case "UnauthorizedError":
      return 401;
    case "ConflictError":
      return 409;
    case "ValidationError":
      return 400;
    case "DatabaseError":
      return 500;
  }
}
