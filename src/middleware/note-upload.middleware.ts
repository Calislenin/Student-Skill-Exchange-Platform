import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const noteUploadDirectory = path.resolve(process.cwd(), env.UPLOAD_DIR);
mkdirSync(noteUploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, noteUploadDirectory),
  filename: (_req, _file, callback) => callback(null, `${randomUUID()}.pdf`),
});

export const uploadNotePdf = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 3,
    parts: 5,
  },
  fileFilter: (_req, file, callback) => {
    const hasPdfExtension = path.extname(file.originalname).toLowerCase() === ".pdf";
    if (file.mimetype !== "application/pdf" || !hasPdfExtension) {
      callback(new AppError("Only PDF files are allowed", 400));
      return;
    }
    callback(null, true);
  },
}).single("file");
