import { Router } from "express";
import { getMyProfile, getPublicProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.patch("/me", requireAuth, updateMyProfile);
router.get("/:id", requireAuth, getPublicProfile);

export default router;
