import { z } from "zod";

const noteFields = {
  title: z.string().trim().min(3).max(160),
  subject: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1000),
};

export const createNoteSchema = z.object(noteFields);

export const updateNoteSchema = z
  .object(noteFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const noteIdSchema = z.string().uuid();

export const listNotesSchema = z.object({
  search: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
