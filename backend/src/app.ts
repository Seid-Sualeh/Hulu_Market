import cors from "cors";
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { transactionsRouter } from "./routes/transactions.js";
import { channelsRouter } from "./routes/channels.js";
import { userRouter } from "./routes/user.js";
import { escrowRouter } from "./routes/escrow.js";
import { uploadRouter } from "./routes/upload.js";

export function createApp(frontendOrigin?: string) {
  const app = express();

  // Configure Helmet with relaxed cross-origin resource policy for uploaded media
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: frontendOrigin && frontendOrigin !== "*" ? frontendOrigin : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  // Global rate limiter
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === "production" ? 2500 : 100000,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) => {
        if (process.env.NODE_ENV !== "production") return true;
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
    limit: process.env.NODE_ENV === "production" ? 30 : 1000,
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

  // Serve static uploaded files
  const uploadsPath = path.resolve("uploads");
  app.use("/uploads", express.static(uploadsPath));

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
