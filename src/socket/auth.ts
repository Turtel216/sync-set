import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthPayload } from "../middleware/auth.middleware";

/** Augment the Socket type to carry authenticated user data */
declare module "socket.io" {
  interface Socket {
    user: AuthPayload;
  }
}

/** Verifies JWT from the handshake auth and attaches user data to the socket */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
