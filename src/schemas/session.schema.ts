import { z } from "zod";

export const createSessionSchema = z.object({
  skillId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
  durationMinutes: z.coerce.number().int().refine((value) => [30, 45, 60].includes(value), {
    message: "Duration must be 30, 45, or 60 minutes",
  }),
  message: z.string().trim().min(10).max(500),
});

export const sessionIdSchema = z.string().uuid();

export const updateSessionStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]),
});

export const updateMeetingLinkSchema = z.object({
  meetingUrl: z
    .string()
    .trim()
    .url("Enter a valid meeting link")
    .max(500)
    .refine((value) => value.startsWith("https://"), "Meeting link must begin with https://"),
});
