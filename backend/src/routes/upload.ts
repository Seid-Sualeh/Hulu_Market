import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

export const uploadRouter = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".webm",
  ".ogg",
  ".mp4",
  ".mp3",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("Invalid file extension. Only image and audio files are allowed."));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Invalid file type. Only image and audio files are allowed."));
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload
 * Handles file uploads (screenshots, voice recordings, chat images).
 * Returns the URL to access the uploaded file with clean error handling.
 */
uploadRouter.post(
  "/",
  (req: Request, res: Response, next: NextFunction): void => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const error = err as Error;
        res.status(400).json({ success: false, error: error.message || "File upload failed." });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: "No file uploaded." });
        return;
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.status(201).json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  }
);
