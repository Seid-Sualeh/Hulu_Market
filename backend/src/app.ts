import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export function createApp(frontendOrigin: string) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ name: "hulu-market-backend", status: "ok" });
  });

  return app;
}
