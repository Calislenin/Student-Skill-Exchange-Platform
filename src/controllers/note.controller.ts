import { open, unlink } from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/database.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { noteUploadDirectory } from "../middleware/note-upload.middleware.js";
import {
  createNoteSchema,
  listNotesSchema,
  noteIdSchema,
  updateNoteSchema,
} from "../schemas/note.schema.js";
import { AppError } from "../utils/app-error.js";

const noteSelect = {
  id: true,
  title: true,
  subject: true,
  description: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  uploaderId: true,
  createdAt: true,
  updatedAt: true,
  uploader: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  },
} as const;

function validationError(details: unknown): AppError {
  return new AppError("Please check the submitted note information", 400, details);
}

function storedFilePath(storedName: string): string {
  return path.join(noteUploadDirectory, storedName);
}

async function removeFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      console.error("Could not remove uploaded note file", error);
    }
  }
}

async function isPdf(filePath: string): Promise<boolean> {
  const handle = await open(filePath, "r");
  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    return bytesRead === 5 && signature.toString("ascii") === "%PDF-";
  } finally {
    await handle.close();
  }
}

function cleanOriginalName(fileName: string): string {
  return path.basename(fileName).replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 255);
}

export async function listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listNotesSchema.safeParse(req.query);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const { search, subject, limit } = parsed.data;
    const where: Prisma.NoteWhereInput = {
      ...(subject ? { subject: { equals: subject, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { uploader: { fullName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const notes = await prisma.note.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: noteSelect,
    });

    res.json({ success: true, notes, count: notes.length });
  } catch (error) {
    next(error);
  }
}

export async function getNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const note = await prisma.note.findUnique({ where: { id: parsedId.data }, select: noteSelect });
    if (!note) throw new AppError("Note not found", 404);
    res.json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function downloadNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const note = await prisma.note.findUnique({
      where: { id: parsedId.data },
      select: { originalName: true, storedName: true },
    });
    if (!note) throw new AppError("Note not found", 404);

    res.download(storedFilePath(note.storedName), note.originalName, (error) => {
      if (error && !res.headersSent) next(new AppError("The PDF file could not be found", 404));
    });
  } catch (error) {
    next(error);
  }
}

export async function createNote(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const uploadedPath = req.file?.path;
  try {
    if (!req.file) throw new AppError("Choose a PDF file to upload", 400);

    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);
    if (!(await isPdf(req.file.path))) throw new AppError("The selected file is not a valid PDF", 400);

    const note = await prisma.note.create({
      data: {
        ...parsed.data,
        originalName: cleanOriginalName(req.file.originalname),
        storedName: req.file.filename,
        mimeType: "application/pdf",
        fileSize: req.file.size,
        uploaderId: req.userId!,
      },
      select: noteSelect,
    });

    res.status(201).json({ success: true, message: "Note uploaded successfully", note });
  } catch (error) {
    if (uploadedPath) await removeFile(uploadedPath);
    next(error);
  }
}

export async function updateNote(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);
    const parsed = updateNoteSchema.safeParse(req.body);
    if (!parsed.success) throw validationError(parsed.error.issues);

    const existing = await prisma.note.findUnique({
      where: { id: parsedId.data },
      select: { uploaderId: true },
    });
    if (!existing) throw new AppError("Note not found", 404);
    if (existing.uploaderId !== req.userId) throw new AppError("You can edit only your own notes", 403);

    const note = await prisma.note.update({
      where: { id: parsedId.data },
      data: parsed.data,
      select: noteSelect,
    });
    res.json({ success: true, message: "Note updated successfully", note });
  } catch (error) {
    next(error);
  }
}

export async function deleteNote(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsedId = noteIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw validationError(parsedId.error.issues);

    const existing = await prisma.note.findUnique({
      where: { id: parsedId.data },
      select: { uploaderId: true, storedName: true },
    });
    if (!existing) throw new AppError("Note not found", 404);
    if (existing.uploaderId !== req.userId) throw new AppError("You can delete only your own notes", 403);

    await prisma.note.delete({ where: { id: parsedId.data } });
    await removeFile(storedFilePath(existing.storedName));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
