import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { AUTH_COOKIE_NAME, readAccessToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = req.header("authorization");
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;

    if (!token) throw new AppError("Please log in to continue", 401);

    const userId = readAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) throw new AppError("The user for this session no longer exists", 401);

    req.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
}
