import type { NextFunction, Response } from "express";
import { prisma } from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { createSessionSchema, sessionIdSchema, updateMeetingLinkSchema, updateSessionStatusSchema } from "../schemas/session.schema.js";
import { AppError } from "../utils/app-error.js";

const sessionSelect = {
  id: true,
  scheduledAt: true,
  durationMinutes: true,
  message: true,
  status: true,
  meetingUrl: true,
  meetingAddedAt: true,
  requesterId: true,
  hostId: true,
  skillId: true,
  createdAt: true,
  updatedAt: true,
  skill: { select: { id: true, title: true, category: true } },
  requester: { select: { id: true, fullName: true, department: true, studyYear: true } },
  host: { select: { id: true, fullName: true, department: true, studyYear: true } },
} as const;

export async function listMySessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await prisma.sessionRequest.findMany({
      where: { OR: [{ requesterId: req.userId }, { hostId: req.userId }] },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      select: sessionSelect,
    });
    res.json({ success: true, sessions, count: sessions.length });
  } catch (error) {
    next(error);
  }
}

export async function createSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Please check the session information", 400, parsed.error.issues);

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (scheduledAt.getTime() < Date.now() + 15 * 60 * 1000) {
      throw new AppError("Choose a session time at least 15 minutes from now", 400);
    }

    const skill = await prisma.skill.findUnique({
      where: { id: parsed.data.skillId },
      select: { creatorId: true },
    });
    if (!skill) throw new AppError("Skill not found", 404);
    if (skill.creatorId === req.userId) throw new AppError("You cannot request your own skill", 400);

    const session = await prisma.sessionRequest.create({
      data: {
        skillId: parsed.data.skillId,
        requesterId: req.userId!,
        hostId: skill.creatorId,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        message: parsed.data.message,
      },
      select: sessionSelect,
    });
    res.status(201).json({ success: true, message: "Session request sent successfully", session });
  } catch (error) {
    next(error);
  }
}

export async function updateSessionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = sessionIdSchema.safeParse(req.params.id);
    const parsedBody = updateSessionStatusSchema.safeParse(req.body);
    if (!parsedId.success || !parsedBody.success) throw new AppError("Invalid session update", 400);

    const existing = await prisma.sessionRequest.findUnique({ where: { id: parsedId.data } });
    if (!existing) throw new AppError("Session request not found", 404);
    const nextStatus = parsedBody.data.status;
    const isHost = existing.hostId === req.userId;
    const isRequester = existing.requesterId === req.userId;

    if (["ACCEPTED", "DECLINED"].includes(nextStatus) && (!isHost || existing.status !== "PENDING")) {
      throw new AppError("Only the host can accept or decline a pending request", 403);
    }
    if (nextStatus === "CANCELLED" && (!isRequester || !["PENDING", "ACCEPTED"].includes(existing.status))) {
      throw new AppError("Only the requester can cancel an active request", 403);
    }
    if (nextStatus === "COMPLETED" && (!isHost || existing.status !== "ACCEPTED")) {
      throw new AppError("Only the host can complete an accepted session", 403);
    }
    if (nextStatus === "COMPLETED" && existing.scheduledAt.getTime() > Date.now()) {
      throw new AppError("Complete the session only after its scheduled start time", 400);
    }

    const session = await prisma.sessionRequest.update({
      where: { id: parsedId.data },
      data: { status: nextStatus },
      select: sessionSelect,
    });
    res.json({ success: true, message: `Session marked as ${nextStatus.toLowerCase()}`, session });
  } catch (error) {
    next(error);
  }
}

export async function updateMeetingLink(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = sessionIdSchema.safeParse(req.params.id);
    const parsedBody = updateMeetingLinkSchema.safeParse(req.body);
    if (!parsedId.success || !parsedBody.success) {
      throw new AppError("Enter a valid HTTPS meeting link", 400, parsedBody.success ? undefined : parsedBody.error.issues);
    }

    const existing = await prisma.sessionRequest.findUnique({ where: { id: parsedId.data } });
    if (!existing) throw new AppError("Session request not found", 404);
    if (existing.hostId !== req.userId) throw new AppError("Only the session host can add the meeting link", 403);
    if (existing.status !== "ACCEPTED") throw new AppError("Accept the session before adding a meeting link", 400);

    const session = await prisma.sessionRequest.update({
      where: { id: parsedId.data },
      data: { meetingUrl: parsedBody.data.meetingUrl, meetingAddedAt: new Date() },
      select: sessionSelect,
    });
    res.json({ success: true, message: "Meeting link saved successfully", session });
  } catch (error) {
    next(error);
  }
}
