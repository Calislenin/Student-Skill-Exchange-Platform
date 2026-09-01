import type { NextFunction, Response } from "express";
import { prisma } from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { profileIdSchema, updateProfileSchema } from "../schemas/profile.schema.js";
import { AppError } from "../utils/app-error.js";

const profileSelect = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
  department: true,
  studyYear: true,
  bio: true,
  createdAt: true,
  _count: { select: { skills: true, notes: true, hostedSessions: true } },
} as const;

export async function getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await prisma.user.findUnique({ where: { id: req.userId }, select: profileSelect });
    if (!profile) throw new AppError("Profile not found", 404);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = profileIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw new AppError("Invalid profile ID", 400, parsedId.error.issues);
    const profile = await prisma.user.findUnique({ where: { id: parsedId.data }, select: profileSelect });
    if (!profile) throw new AppError("Profile not found", 404);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Please check your profile information", 400, parsed.error.issues);

    const data = {
      ...parsed.data,
      department: parsed.data.department === undefined ? undefined : parsed.data.department || null,
      bio: parsed.data.bio === undefined ? undefined : parsed.data.bio || null,
    };
    const profile = await prisma.user.update({ where: { id: req.userId }, data, select: profileSelect });
    res.json({ success: true, message: "Profile updated successfully", profile });
  } catch (error) {
    next(error);
  }
}
