import { z } from "zod";

export const skillCategories = [
  "Coding",
  "Design",
  "Communication",
  "Study Skills",
  "Other",
] as const;

export const skillLevels = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All levels",
] as const;

const skillFields = {
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(skillCategories),
  level: z.enum(skillLevels),
  lessonCount: z.coerce.number().int().min(1).max(100),
};

export const createSkillSchema = z.object(skillFields);

export const updateSkillSchema = z
  .object(skillFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const skillIdSchema = z.string().uuid();

export const listSkillsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(skillCategories).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
