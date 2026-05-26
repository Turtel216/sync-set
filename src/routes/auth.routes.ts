import { Router, Request, Response } from "express";
import * as AuthService from "../services/auth.service";
import { runEffect } from "../lib/run-effect";

const router = Router();

router.post("/register", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  runEffect(res, AuthService.register(username.trim(), password), 201);
});

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  runEffect(res, AuthService.login(username, password));
});

export default router;
