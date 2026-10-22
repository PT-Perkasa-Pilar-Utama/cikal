import { readFileSync } from "node:fs";
import { z } from "zod";

const appEnvSchema = z.enum(["dev", "test", "sit", "uat", "production"]);
export type AppEnv = z.infer<typeof appEnvSchema>;

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

/** Environment variable teknis (technical-specs 11 §11.2). Konfigurasi bisnis per tenant tidak ada di sini. */
export const envSchema = z
  .object({
    APP_ENV: appEnvSchema,
    APP_VERSION: z.string().default("0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),
    PROCESS_ROLE: z.enum(["api", "worker"]).default("api"),
    DATABASE_URL: z.string().startsWith("postgres"),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_FILE: z.string().min(1),
    S3_SECRET_KEY_FILE: z.string().min(1),
    S3_FORCE_PATH_STYLE: flag,
    MONITORING_TOKEN_FILE: z.string().min(1),
    ENABLE_RESET_API: flag,
    RESET_API_TOKEN_FILE: z.string().optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.ENABLE_RESET_API) {
      ctx.addIssue({ code: "custom", path: ["ENABLE_RESET_API"], message: "must not be true in production" });
    }
    if (env.ENABLE_RESET_API && !env.RESET_API_TOKEN_FILE) {
      ctx.addIssue({
        code: "custom",
        path: ["RESET_API_TOKEN_FILE"],
        message: "is required when ENABLE_RESET_API=true",
      });
    }
  });

export interface AppConfig {
  appEnv: AppEnv;
  version: string;
  port: number;
  processRole: "api" | "worker";
  logLevel: string;
  database: { url: string; poolMax: number };
  storage: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
  monitoringToken: string;
  /** Terisi hanya bila rute reset-state boleh didaftarkan (technical-specs 07 §7.8). */
  resetApi: { token: string } | null;
}

const RESET_ENVIRONMENTS: ReadonlySet<AppEnv> = new Set(["dev", "test", "sit", "uat"]);

const readSecret = (path: string): string => readFileSync(path, "utf8").trim();

/** Validasi env saat start; nilai tidak valid menghentikan proses dengan pesan jelas. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const env = parsed.data;
  const resetAllowed = env.ENABLE_RESET_API && RESET_ENVIRONMENTS.has(env.APP_ENV);
  return {
    appEnv: env.APP_ENV,
    version: env.APP_VERSION,
    port: env.PORT,
    processRole: env.PROCESS_ROLE,
    logLevel: env.LOG_LEVEL,
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX },
    storage: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKey: readSecret(env.S3_ACCESS_KEY_FILE),
      secretKey: readSecret(env.S3_SECRET_KEY_FILE),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    monitoringToken: readSecret(env.MONITORING_TOKEN_FILE),
    resetApi: resetAllowed && env.RESET_API_TOKEN_FILE ? { token: readSecret(env.RESET_API_TOKEN_FILE) } : null,
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");
