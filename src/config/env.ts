import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://syncset:syncset@db:5432/syncset",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret",
  PORT: parseInt(process.env.PORT || "3001", 10),
} as const;
