import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as BandService from "../services/band.service";
import { runEffect } from "../lib/run-effect";

const router = Router();

router.use(authMiddleware);

router.post("/", (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    res.status(400).json({ error: "Band name is required" });
    return;
  }

  runEffect(res, BandService.createBand(name.trim(), req.user!.userId), 201);
});

router.get("/", (req: Request, res: Response) => {
  runEffect(res, BandService.getUserBands(req.user!.userId));
});

router.get("/:bandId", (req: Request, res: Response) => {
  const bandId = req.params.bandId as string;
  runEffect(res, BandService.getBandById(bandId, req.user!.userId));
});

router.post("/:bandId/members", (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const bandId = req.params.bandId as string;
  runEffect(
    res,
    BandService.addMember(bandId, username.trim(), req.user!.userId),
    201
  );
});

export default router;
