import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import apiRoutes from "./routes/index.js";

export const app = express();
const publicDirectory = path.resolve(process.cwd(), "public");

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "SkillExchange API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRoutes);
app.use(express.static(publicDirectory));
app.use(notFound);
app.use(errorHandler);
