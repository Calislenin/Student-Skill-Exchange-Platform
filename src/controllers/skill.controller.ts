import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createSkillSchema,
  listSkillsSchema,
  skillIdSchema,
  updateSkillSchema,
} from "../schemas/skill.schema.js";
import { AppError } from "../utils/app-error.js";

const skillSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  level: true,
  lessonCount: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  },
} as const;

function validationError(details: unknown): AppError {
  return new AppError("Please check the submitted skill information", 400, details);
}

export async function listSkills(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = listSkillsSchema.safeParse(req.query);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const { search, category, limit } = parsed.data;
    const where: Prisma.SkillWhereInput = {
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { creator: { fullName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const skills = await prisma.skill.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: skillSelect,
    });

    res.json({ success: true, skills, count: skills.length });
  } catch (error) {
    next(error);
  }
}

export async function getSkill(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedId = skillIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const skill = await prisma.skill.findUnique({
      where: { id: parsedId.data },
      select: skillSelect,
    });

    if (!skill) throw new AppError("Skill not found", 404);
    res.json({ success: true, skill });
  } catch (error) {
    next(error);
  }
}

export async function createSkill(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createSkillSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const skill = await prisma.skill.create({
      data: {
        ...parsed.data,
        creatorId: req.userId!,
      },
      select: skillSelect,
    });

    res.status(201).json({ success: true, message: "Skill shared successfully", skill });
  } catch (error) {
    next(error);
  }
}

export async function updateSkill(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedId = skillIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const parsed = updateSkillSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const existingSkill = await prisma.skill.findUnique({
      where: { id: parsedId.data },
      select: { creatorId: true },
    });

    if (!existingSkill) throw new AppError("Skill not found", 404);
    if (existingSkill.creatorId !== req.userId) {
      throw new AppError("You can edit only the skills you shared", 403);
    }

    const skill = await prisma.skill.update({
      where: { id: parsedId.data },
      data: parsed.data,
      select: skillSelect,
    });

    res.json({ success: true, message: "Skill updated successfully", skill });
  } catch (error) {
    next(error);
  }
}

export async function deleteSkill(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedId = skillIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const existingSkill = await prisma.skill.findUnique({
      where: { id: parsedId.data },
      select: { creatorId: true },
    });

    if (!existingSkill) throw new AppError("Skill not found", 404);
    if (existingSkill.creatorId !== req.userId) {
      throw new AppError("You can delete only the skills you shared", 403);
    }

    await prisma.skill.delete({ where: { id: parsedId.data } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
