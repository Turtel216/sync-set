import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as SongService from "../services/song.service";
import { runEffect } from "../lib/run-effect";

const router = Router();

router.use(authMiddleware);

router.post("/gigs/:gigId/songs", (req: Request, res: Response) => {
  const { title, artist, bpm, key } = req.body;

  if (!title || typeof title !== "string" || title.trim().length < 1) {
    res.status(400).json({ error: "Song title is required" });
    return;
  }

  if (!artist || typeof artist !== "string" || artist.trim().length < 1) {
    res.status(400).json({ error: "Song artist is required" });
    return;
  }

  if (bpm !== undefined && (typeof bpm !== "number" || bpm < 1)) {
    res.status(400).json({ error: "BPM must be a positive number" });
    return;
  }

  const gigId = req.params.gigId as string;
  runEffect(
    res,
    SongService.addSong(gigId, title.trim(), artist.trim(), req.user!.userId, bpm, key),
    201
  );
});

router.delete("/songs/:songId", (req: Request, res: Response) => {
  const songId = req.params.songId as string;
  runEffect(res, SongService.removeSong(songId, req.user!.userId));
});

router.post("/songs/:songId/vote", (req: Request, res: Response) => {
  const { value } = req.body;

  if (value !== 1 && value !== -1) {
    res.status(400).json({ error: "Vote value must be 1 or -1" });
    return;
  }

  const songId = req.params.songId as string;
  runEffect(res, SongService.voteSong(songId, req.user!.userId, value));
});

router.patch("/gigs/:gigId/setlist", (req: Request, res: Response) => {
  const { songIds } = req.body;

  if (!Array.isArray(songIds) || !songIds.every((id: unknown) => typeof id === "string")) {
    res.status(400).json({ error: "songIds must be an array of strings" });
    return;
  }

  const gigId = req.params.gigId as string;
  runEffect(res, SongService.updateSetlistOrder(gigId, songIds, req.user!.userId));
});

export default router;
