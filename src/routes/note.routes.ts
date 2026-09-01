import { Router } from "express";
import {
  createNote,
  deleteNote,
  downloadNote,
  getNote,
  listNotes,
  updateNote,
} from "../controllers/note.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadNotePdf } from "../middleware/note-upload.middleware.js";

const router = Router();

router.get("/", listNotes);
router.get("/:id/download", downloadNote);
router.get("/:id", getNote);
router.post("/", requireAuth, uploadNotePdf, createNote);
router.patch("/:id", requireAuth, updateNote);
router.delete("/:id", requireAuth, deleteNote);

export default router;
