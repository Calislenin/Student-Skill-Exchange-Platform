import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createLessonSchema,
  lessonIdSchema,
  skillIdSchema,
  updateLessonSchema,
} from "../schemas/lesson.schema.js";
import { AppError } from "../utils/app-error.js";

const lessonSelect = {
  id: true,
  title: true,
  description: true,
  videoUrl: true,
  position: true,
  skillId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function validationError(details: unknown): AppError {
  return new AppError("Please check the submitted lesson information", 400, details);
}

async function requireSkillOwner(skillId: string, userId: string): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { creatorId: true },
  });

  if (!skill) throw new AppError("Skill not found", 404);
  if (skill.creatorId !== userId) {
    throw new AppError("Only the skill owner can manage its lessons", 403);
  }
}

export async function listLessons(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedSkillId = skillIdSchema.safeParse(req.params.skillId);
    if (!parsedSkillId.success) throw validationError(parsedSkillId.error.issues);

    const skill = await prisma.skill.findUnique({
      where: { id: parsedSkillId.data },
      select: { id: true, title: true, creatorId: true },
    });
    if (!skill) throw new AppError("Skill not found", 404);

    const lessons = await prisma.skillLesson.findMany({
      where: { skillId: skill.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: lessonSelect,
    });

    res.json({ success: true, skill, lessons, count: lessons.length });
  } catch (error) {
    next(error);
  }
}

export async function createLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedSkillId = skillIdSchema.safeParse(req.params.skillId);
    if (!parsedSkillId.success) throw validationError(parsedSkillId.error.issues);
    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    await requireSkillOwner(parsedSkillId.data, req.userId!);
    const position = parsed.data.position ?? (await prisma.skillLesson.count({
      where: { skillId: parsedSkillId.data },
    })) + 1;

    const lesson = await prisma.skillLesson.create({
      data: { ...parsed.data, position, skillId: parsedSkillId.data },
      select: lessonSelect,
    });

    res.status(201).json({ success: true, message: "Lesson published successfully", lesson });
  } catch (error) {
    next(error);
  }
}

export async function updateLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedSkillId = skillIdSchema.safeParse(req.params.skillId);
    const parsedLessonId = lessonIdSchema.safeParse(req.params.lessonId);
    if (!parsedSkillId.success || !parsedLessonId.success) {
      throw validationError([
        ...(parsedSkillId.success ? [] : parsedSkillId.error.issues),
        ...(parsedLessonId.success ? [] : parsedLessonId.error.issues),
      ]);
    }
    const parsed = updateLessonSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    await requireSkillOwner(parsedSkillId.data, req.userId!);
    const existing = await prisma.skillLesson.findFirst({
      where: { id: parsedLessonId.data, skillId: parsedSkillId.data },
      select: { id: true },
    });
    if (!existing) throw new AppError("Lesson not found", 404);

    const lesson = await prisma.skillLesson.update({
      where: { id: existing.id },
      data: parsed.data,
      select: lessonSelect,
    });
    res.json({ success: true, message: "Lesson updated successfully", lesson });
  } catch (error) {
    next(error);
  }
}

export async function deleteLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedSkillId = skillIdSchema.safeParse(req.params.skillId);
    const parsedLessonId = lessonIdSchema.safeParse(req.params.lessonId);
    if (!parsedSkillId.success || !parsedLessonId.success) {
      throw validationError("Invalid skill or lesson identifier");
    }

    await requireSkillOwner(parsedSkillId.data, req.userId!);
    const existing = await prisma.skillLesson.findFirst({
      where: { id: parsedLessonId.data, skillId: parsedSkillId.data },
      select: { id: true },
    });
    if (!existing) throw new AppError("Lesson not found", 404);

    await prisma.skillLesson.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
