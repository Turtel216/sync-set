import express from "express";
import cors from "cors";
import { createServer } from "http";
import { env } from "./config/env";
import { createSocketServer } from "./socket";
import authRoutes from "./routes/auth.routes";
import bandRoutes from "./routes/band.routes";
import gigRoutes from "./routes/gig.routes";
import songRoutes from "./routes/song.routes";

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/bands", bandRoutes);
app.use("/api", gigRoutes);
app.use("/api", songRoutes);

const io = createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`SyncSet server running on port ${env.PORT}`);
});

export { app, io };
