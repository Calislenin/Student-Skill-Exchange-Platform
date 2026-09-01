import bcrypt from "bcryptjs";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { AppError } from "../utils/app-error.js";
import { AUTH_COOKIE_NAME, createAccessToken } from "../utils/jwt.js";

const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
  department: true,
  studyYear: true,
  bio: true,
  role: true,
  createdAt: true,
} as const;

function validateBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError(
      "Please check the submitted information",
      400,
      result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
    path: "/",
  };
}

function sendLoginCookie(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE_NAME, createAccessToken(userId), cookieOptions());
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = validateBody(registerSchema, req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) throw new AppError("An account with this email already exists", 409);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
      select: publicUserSelect,
    });

    sendLoginCookie(res, user.id);
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = validateBody(loginSchema, req.body);
    const userWithPassword = await prisma.user.findUnique({ where: { email: data.email } });

    if (!userWithPassword || !(await bcrypt.compare(data.password, userWithPassword.passwordHash))) {
      throw new AppError("Email or password is incorrect", 401);
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userWithPassword.id },
      select: publicUserSelect,
    });

    sendLoginCookie(res, user.id);
    res.json({ success: true, message: "Logged in successfully", user });
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response): void {
  const options = cookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
  res.json({ success: true, message: "Logged out successfully" });
}

export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: publicUserSelect,
    });

    if (!user) throw new AppError("User not found", 404);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}
