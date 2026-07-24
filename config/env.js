import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  XAI_API_KEY: z.string().min(1, "XAI_API_KEY is required"),
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"),
  QDRANT_URL: z.string().url("QDRANT_URL must be a valid URL"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  QDRANT_API_KEY: z.string().min(1, "QDRANT_API_KEY is required"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  // Auth is disabled for now (see server.js). Set this and re-enable
  // apiKeyAuth in server.js before deploying publicly.
  API_KEY: z.string().min(16).optional(),

  // CORS - "*" for now during dev, replace with real origin(s) once deployed
  ALLOWED_ORIGINS: z.string().default("*"),

  //

  // Redis-backed session memory
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;