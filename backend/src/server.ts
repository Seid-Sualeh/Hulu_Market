import "dotenv/config";
import { createApp } from "./app.js";
import { initDatabase } from "./config/db.js";
import { getJwtSecret } from "./middleware/auth.js";

// Production Security Validation: fail fast if critical environment variables are missing
if (process.env.NODE_ENV === "production") {
  if (!process.env.FRONTEND_ORIGIN) {
    throw new Error(
      "[Security Startup Failure] FRONTEND_ORIGIN must be explicitly configured in production!"
    );
  }
  // Throws if JWT_SECRET is missing or weak (< 32 chars)
  getJwtSecret();
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;
const frontendOrigin = process.env.FRONTEND_ORIGIN;

const app = createApp(frontendOrigin);

// Initialize Database
initDatabase().catch((err) => {
  console.warn("[Database] Initialization check:", err.message);
});

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
