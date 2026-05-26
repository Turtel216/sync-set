import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as GigService from "../services/gig.service";
import { runEffect } from "../lib/run-effect";

const router = Router();

router.use(authMiddleware);

router.post("/bands/:bandId/gigs", (req: Request, res: Response) => {
  const { name, date, venue } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    res.status(400).json({ error: "Gig name is required" });
    return;
  }

  if (!date || typeof date !== "string") {
    res.status(400).json({ error: "Gig date is required" });
    return;
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    res.status(400).json({ error: "Invalid date format" });
    return;
  }

  const bandId = req.params.bandId as string;
  runEffect(
    res,
    GigService.createGig(bandId, name.trim(), date, venue, req.user!.userId),
    201
  );
});

router.get("/bands/:bandId/gigs", (req: Request, res: Response) => {
  const bandId = req.params.bandId as string;
  runEffect(res, GigService.getBandGigs(bandId, req.user!.userId));
});

router.get("/gigs/:gigId", (req: Request, res: Response) => {
  const gigId = req.params.gigId as string;
  runEffect(res, GigService.getGigById(gigId, req.user!.userId));
});

export default router;
