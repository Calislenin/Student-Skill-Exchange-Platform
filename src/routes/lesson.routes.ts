import { Router } from "express";
import {
  createLesson,
  deleteLesson,
  listLessons,
  updateLesson,
} from "../controllers/lesson.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:skillId/lessons", listLessons);
router.post("/:skillId/lessons", requireAuth, createLesson);
router.patch("/:skillId/lessons/:lessonId", requireAuth, updateLesson);
router.delete("/:skillId/lessons/:lessonId", requireAuth, deleteLesson);

export default router;
