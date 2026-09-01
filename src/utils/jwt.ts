import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./app-error.js";

export const AUTH_COOKIE_NAME = "skill_exchange_token";

export function createAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
}

export function readAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === "string" || typeof payload.userId !== "string") {
      throw new AppError("Invalid login token", 401);
    }

    return payload.userId;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Your session is invalid or has expired", 401);
  }
}
