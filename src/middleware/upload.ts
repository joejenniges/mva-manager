import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { LIMITS } from "../constants.js";

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const upload = multer({
  storage,
  limits: { fileSize: LIMITS.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Accepted: PDF, JPEG, PNG, WebP`));
    }
  },
});
