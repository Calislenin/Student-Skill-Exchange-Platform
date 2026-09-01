import { Router } from "express";
import {
  createSkill,
  deleteSkill,
  getSkill,
  listSkills,
  updateSkill,
} from "../controllers/skill.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", listSkills);
router.get("/:id", getSkill);
router.post("/", requireAuth, createSkill);
router.patch("/:id", requireAuth, updateSkill);
router.delete("/:id", requireAuth, deleteSkill);

export default router;
