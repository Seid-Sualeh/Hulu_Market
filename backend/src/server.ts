import "dotenv/config";
import { createApp } from "./app.js";
import { initDatabase } from "./config/db.js";

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
