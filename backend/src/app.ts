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

  app.use(helmet());
  app.use(
    cors({
      origin: frontendOrigin && frontendOrigin !== "*" ? frontendOrigin : true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  const healthCheck = (_request: express.Request, response: express.Response) => {
    response.json({ name: "hulu-market-backend", status: "ok" });
  };

  // Support both /health and /api/health for internal bindings and public rewrites
  app.get("/health", healthCheck);
  app.get("/api/health", healthCheck);

  // Mount Auth routes (supported both with and without /api prefix)
  app.use("/auth", authRouter);
  app.use("/api/auth", authRouter);

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

  return app;
}

export default createApp();
