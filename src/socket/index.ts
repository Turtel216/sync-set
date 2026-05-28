import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { socketAuthMiddleware } from "./auth";
import { registerSocketHandlers } from "./handlers";

/** Creates and configures the Socket.io server */
export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.username} (${socket.id})`);
    registerSocketHandlers(io, socket);
  });

  return io;
}
