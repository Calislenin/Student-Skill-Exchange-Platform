import { z } from "zod";

const httpsVideoUrl = z
  .string()
  .trim()
  .min(1, "Enter a video link")
  .max(500)
  .url("Enter a complete video URL")
  .refine((value) => new URL(value).protocol === "https:", "Use a secure HTTPS video link");

const lessonFields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(1000),
  videoUrl: httpsVideoUrl,
  position: z.coerce.number().int().min(1).max(100).optional(),
};

export const createLessonSchema = z.object(lessonFields);

export const updateLessonSchema = z
  .object(lessonFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const skillIdSchema = z.string().uuid();
export const lessonIdSchema = z.string().uuid();
