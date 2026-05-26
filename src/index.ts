import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import bandRoutes from "./routes/band.routes";
import gigRoutes from "./routes/gig.routes";
import songRoutes from "./routes/song.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/bands", bandRoutes);
app.use("/api", gigRoutes);
app.use("/api", songRoutes);

app.listen(env.PORT, () => {
  console.log(`SyncSet server running on port ${env.PORT}`);
});

export default app;
