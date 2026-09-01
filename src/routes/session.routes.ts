import { Router } from "express";
import { createSession, listMySessions, updateMeetingLink, updateSessionStatus } from "../controllers/session.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listMySessions);
router.post("/", createSession);
router.patch("/:id/status", updateSessionStatus);
router.patch("/:id/meeting", updateMeetingLink);

export default router;
