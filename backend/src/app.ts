import cors from "cors";
import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { transactionsRouter } from "./routes/transactions.js";
import { channelsRouter } from "./routes/channels.js";
import { digitalFilesRouter } from "./routes/digitalFiles.js";
import { userRouter } from "./routes/user.js";
import { escrowRouter } from "./routes/escrow.js";
import { uploadRouter } from "./routes/upload.js";
import { getJwtSecret } from "./middleware/auth.js";

export function createApp(frontendOrigin?: string) {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  // Configure Helmet with relaxed cross-origin resource policy for uploaded media
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Build explicit allowed origins set for production
  const allowedOrigins = new Set<string>([
    "https://hulu-market.vercel.app",
  ]);

  if (frontendOrigin && frontendOrigin !== "*") {
    frontendOrigin.split(",").forEach((origin) => {
      const clean = origin.trim().replace(/\/+$/, "");
      if (clean) allowedOrigins.add(clean);
    });
  }

  const additionalOrigins = process.env.ADDITIONAL_ORIGINS;
  if (additionalOrigins) {
    additionalOrigins.split(",").forEach((origin) => {
      const clean = origin.trim().replace(/\/+$/, "");
      if (clean) allowedOrigins.add(clean);
    });
  }

  // Fail safely if required production CORS configuration is missing
  if (isProduction && allowedOrigins.size === 0) {
    throw new Error(
      "[CORS Configuration Error] Production requires explicit allowed origins. FRONTEND_ORIGIN must be set."
    );
  }

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
        if (!requestOrigin) {
          callback(null, true);
          return;
        }

        const normalized = requestOrigin.trim().replace(/\/+$/, "");

        if (!isProduction) {
          // In development, allow localhost and loopback interfaces
          if (
            normalized.includes("localhost") ||
            normalized.includes("127.0.0.1") ||
            allowedOrigins.has(normalized)
          ) {
            callback(null, true);
            return;
          }
          // Default development permissive behavior without weakening production
          callback(null, true);
          return;
        }

        // In production: strictly verify against explicit allowlist
        if (allowedOrigins.has(normalized)) {
          callback(null, true);
        } else {
          callback(new Error(`[CORS Policy Violation] Origin '${requestOrigin}' is not permitted.`));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));

  // Global rate limiter
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: isProduction ? 2500 : 100000,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) => {
        if (!isProduction) return true;
        const ip = req.ip || req.socket.remoteAddress || "";
        return ip.includes("127.0.0.1") || ip.includes("::1") || ip.includes("localhost");
      },
      message: {
        success: false,
        error: "Too many requests from this IP, please try again after 15 minutes.",
      },
    })
  );

  // Stricter rate limiter specifically for Authentication endpoints (prevent brute force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 30 : 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many authentication attempts. Please wait 15 minutes before trying again.",
    },
  });

  const healthCheck = (_request: express.Request, response: express.Response) => {
    response.json({ name: "hulu-market-backend", status: "ok" });
  };

  // Support both /health and /api/health for internal bindings and public rewrites
  app.get("/health", healthCheck);
  app.get("/api/health", healthCheck);

  // Mount Auth routes with authLimiter
  app.use("/auth", authLimiter, authRouter);
  app.use("/api/auth", authLimiter, authRouter);

  // Mount Admin routes
  app.use("/admin", adminRouter);
  app.use("/api/admin", adminRouter);

  // Mount Transactions routes (Deposits, Withdrawals, History)
  app.use("/transactions", transactionsRouter);
  app.use("/api/transactions", transactionsRouter);

  // Mount Digital Product original file routes (before general channels route)
  app.use("/channels", digitalFilesRouter);
  app.use("/api/channels", digitalFilesRouter);

  // Mount Channels routes
  app.use("/channels", channelsRouter);
  app.use("/api/channels", channelsRouter);

  // Mount User stats & profile routes
  app.use("/user", userRouter);
  app.use("/api/user", userRouter);

  // Mount Escrow routes (P2P orders, buyer-seller chat supervised by admin)
  app.use("/escrow", escrowRouter);
  app.use("/api/escrow", escrowRouter);

  // Mount Upload route for file uploads (screenshots, voice, images)
  app.use("/upload", uploadRouter);
  app.use("/api/upload", uploadRouter);

  // 1. Authenticated access for private uploads (deposit receipts, escrow screenshots, voice recordings)
  const privateHandler = (req: express.Request, res: express.Response): void => {
    // Extract token from Authorization header OR ?token= query parameter FIRST to prevent enumeration
    let token: string | null = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (typeof req.query.token === "string") {
      token = req.query.token.trim();
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Authentication required to access private file.",
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        userId?: number;
        id?: number;
        role?: string;
      };

      const userId = decoded.userId || decoded.id;
      if (!userId) {
        res.status(401).json({ success: false, error: "Invalid authentication token." });
        return;
      }

      // Prevent path traversal
      const rawParam = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
      const safeFilename = path.basename(rawParam || "");
      if (!safeFilename || safeFilename === "." || safeFilename.includes("..")) {
        res.status(400).json({ success: false, error: "Invalid filename." });
        return;
      }

      const filePath = path.join(path.resolve("uploads/private"), safeFilename);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: "Private file not found." });
        return;
      }

      // Serve private file safely to verified authenticated user
      res.sendFile(filePath);
    } catch {
      res.status(401).json({
        success: false,
        error: "Session expired or invalid token for private file access.",
      });
    }
  };

  app.get("/uploads/private/:filename", privateHandler);
  app.get("/api/uploads/private/:filename", privateHandler);

  // 2. Serve public uploaded files (e.g. channel marketplace listings, logos)
  const publicUploadsPath = path.resolve("uploads/public");
  if (!fs.existsSync(publicUploadsPath)) {
    fs.mkdirSync(publicUploadsPath, { recursive: true });
  }
  app.use("/uploads/public", express.static(publicUploadsPath));
  app.use("/api/uploads/public", express.static(publicUploadsPath));

  // Backwards compatibility for existing public marketplace files
  app.use("/uploads", express.static(publicUploadsPath));

  // Global Express JSON error handler (avoids exposing stack traces or raw database errors)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const error = err as Error;
    console.error("[Unhandled Application Error]:", error);
    res.status(500).json({
      success: false,
      error: "An unexpected server error occurred. Please try again later.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  });

  return app;
}

export default createApp();
