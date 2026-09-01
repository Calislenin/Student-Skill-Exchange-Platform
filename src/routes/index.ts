import { Router } from "express";
import authRoutes from "./auth.routes.js";
import skillRoutes from "./skill.routes.js";
import noteRoutes from "./note.routes.js";
import profileRoutes from "./profile.routes.js";
import sessionRoutes from "./session.routes.js";
import lessonRoutes from "./lesson.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/skills", lessonRoutes);
router.use("/skills", skillRoutes);
router.use("/notes", noteRoutes);
router.use("/profiles", profileRoutes);
router.use("/sessions", sessionRoutes);

export default router;
