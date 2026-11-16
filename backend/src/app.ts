import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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

  return app;
}

export default createApp();
