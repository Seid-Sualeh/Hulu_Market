import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middleware/auth.js";

export const uploadRouter = Router();

// Ensure public and private upload directories exist
const uploadsBaseDir = path.resolve("uploads");
const publicUploadsDir = path.join(uploadsBaseDir, "public");
const privateUploadsDir = path.join(uploadsBaseDir, "private");

for (const dir of [uploadsBaseDir, publicUploadsDir, privateUploadsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Rate limiter for upload endpoint (prevent storage exhaustion and spam)
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 60 : 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Upload limit reached. Please wait 15 minutes before uploading more files.",
  },
});

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
  "video/mp4",
  "video/webm",
]);

/**
 * Validates actual file signature (magic bytes) from the initial bytes of the file.
 * Prevents disguised files (e.g., HTML/PHP/executables renamed to .jpg or .png).
 */
function validateMagicBytes(filePath: string, ext: string): boolean {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, "r");
    try {
      fs.readSync(fd, buffer, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }

    // JPEG: FF D8 FF
    if (ext === ".jpg" || ext === ".jpeg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (ext === ".png") {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    // GIF: GIF87a or GIF89a
    if (ext === ".gif") {
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
      );
    }
    // WEBP: RIFF....WEBP
    if (ext === ".webp") {
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    }
    // MP4: ....ftyp
    if (ext === ".mp4") {
      return (
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70
      );
    }
    // WebM: 1A 45 DF A3 (EBML container)
    if (ext === ".webm") {
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      );
    }
    // OGG: OggS (4F 67 67 53)
    if (ext === ".ogg") {
      return (
        buffer[0] === 0x4f &&
        buffer[1] === 0x67 &&
        buffer[2] === 0x67 &&
        buffer[3] === 0x53
      );
    }
    // MP3: ID3 (49 44 33) or MPEG sync word
    if (ext === ".mp3") {
      const isId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
      const isSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
      return isId3 || isSync;
    }

    return false;
  } catch {
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Route to private or public folder based on requested visibility
    const isPrivate =
      req.query.visibility === "private" ||
      req.body?.visibility === "private" ||
      req.query.type === "deposit" ||
      req.query.type === "escrow";

    cb(null, isPrivate ? privateUploadsDir : publicUploadsDir);
  },
  filename: (_req, file, cb) => {
    // Generate safe, unguessable, non-sequential cryptographically random filename
    const randomName = crypto.randomBytes(20).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("Invalid file extension. Only standard image, audio, and video files are permitted."));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(new Error("Invalid MIME type. Only standard image, audio, and video formats are permitted."));
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload
 * Requires authentication and rate limiting.
 * Validates extension, MIME type, file signature (magic bytes), and isolates private files.
 */
uploadRouter.post(
  "/",
  authenticateToken,
  uploadRateLimiter,
  (req: Request, res: Response): void => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const error = err as Error;
        res.status(400).json({ success: false, error: error.message || "File upload failed." });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: "No file was uploaded." });
        return;
      }

      const filePath = req.file.path;
      const ext = path.extname(req.file.filename).toLowerCase();

      // Validate real file content / magic bytes
      if (!validateMagicBytes(filePath, ext)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
        res.status(400).json({
          success: false,
          error: "Invalid file content: binary signature does not match allowed media type.",
        });
        return;
      }

      const isPrivate =
        req.query.visibility === "private" ||
        req.body?.visibility === "private" ||
        req.query.type === "deposit" ||
        req.query.type === "escrow";

      const fileUrl = isPrivate
        ? `/uploads/private/${req.file.filename}`
        : `/uploads/public/${req.file.filename}`;

      res.status(201).json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        isPrivate,
      });
    });
  }
);
