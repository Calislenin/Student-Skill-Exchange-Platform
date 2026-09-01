import { z } from "zod";

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    department: z.string().trim().min(2).max(100).nullable().optional(),
    studyYear: z.coerce.number().int().min(1).max(8).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one profile field");

export const profileIdSchema = z.string().uuid();
