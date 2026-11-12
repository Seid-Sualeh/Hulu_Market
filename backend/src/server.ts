import "dotenv/config";
import { z } from "zod";
import { createApp } from "./app.js";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
});

const environment = environmentSchema.parse(process.env);
const app = createApp(environment.FRONTEND_ORIGIN);

app.listen(environment.PORT, () => {
  console.log(`Backend listening on http://localhost:${environment.PORT}`);
});
