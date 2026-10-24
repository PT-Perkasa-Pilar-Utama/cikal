import { readFileSync } from "node:fs";
import { z } from "zod";
import { licensePublicKeyPem } from "../../license-public-key.generated.js";
import { readMasterKey } from "./master-key.js";

const appEnvSchema = z.enum(["dev", "test", "sit", "uat", "production"]);
export type AppEnv = z.infer<typeof appEnvSchema>;

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const secureFlag = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

/** Environment variable teknis (technical-specs 11 §11.2). Konfigurasi bisnis per tenant tidak ada di sini. */
export const envSchema = z
  .object({
    APP_ENV: appEnvSchema,
    APP_VERSION: z.string().default("0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),
    PROCESS_ROLE: z.enum(["api", "worker"]).default("api"),
    DATABASE_URL: z.string().startsWith("postgres"),
    DATABASE_MIGRATION_URL: z.string().startsWith("postgres").optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
    MASTER_KEY_FILE: z.string().min(1),
    S3_ENDPOINT: z.url(),
    S3_PUBLIC_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_FILE: z.string().min(1),
    S3_SECRET_KEY_FILE: z.string().min(1),
    S3_FORCE_PATH_STYLE: flag,
    GOTENBERG_URL: z.url().optional(),
    SESSION_COOKIE_SECURE: secureFlag,
    MONITORING_TOKEN_FILE: z.string().min(1),
    ENABLE_RESET_API: flag,
    ALLOW_SIMULATION_ADAPTERS: flag,
    RESET_API_TOKEN_FILE: z.string().optional(),
    DEFAULT_RESET_SEED: z.enum(["dev", "qa"]).default("qa"),
    SEED_USER_PASSWORD_FILE: z.string().min(1).optional(),
    REGION_API_URL: z.url().default("https://oksara.senar.id"),
    REGION_API_KEY_FILE: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD_FILE: z.string().optional(),
    SMTP_FROM: z.email(),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.ENABLE_RESET_API) {
      ctx.addIssue({ code: "custom", path: ["ENABLE_RESET_API"], message: "must not be true in production" });
    }
    // Tenant bertanda trial belum dimodelkan, jadi production menolak adapter simulasi tanpa pengecualian (IN-03).
    if (env.APP_ENV === "production" && env.ALLOW_SIMULATION_ADAPTERS) {
      ctx.addIssue({ code: "custom", path: ["ALLOW_SIMULATION_ADAPTERS"], message: "must not be true in production" });
    }
    if (!env.ALLOW_SIMULATION_ADAPTERS && !env.REGION_API_KEY_FILE) {
      ctx.addIssue({
        code: "custom",
        path: ["REGION_API_KEY_FILE"],
        message: "is required when ALLOW_SIMULATION_ADAPTERS=false",
      });
    }
    if (env.ENABLE_RESET_API && !env.RESET_API_TOKEN_FILE) {
      ctx.addIssue({
        code: "custom",
        path: ["RESET_API_TOKEN_FILE"],
        message: "is required when ENABLE_RESET_API=true",
      });
    }
    if (env.ENABLE_RESET_API && !env.SEED_USER_PASSWORD_FILE) {
      ctx.addIssue({
        code: "custom",
        path: ["SEED_USER_PASSWORD_FILE"],
        message: "is required when ENABLE_RESET_API=true",
      });
    }
    if (env.SMTP_USER && !env.SMTP_PASSWORD_FILE) {
      ctx.addIssue({ code: "custom", path: ["SMTP_PASSWORD_FILE"], message: "is required when SMTP_USER is set" });
    }
    if (env.ENABLE_RESET_API && !env.DATABASE_MIGRATION_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_MIGRATION_URL"],
        message: "is required when ENABLE_RESET_API=true",
      });
    }
  });

export interface AppConfig {
  masterKey: Buffer;
  appEnv: AppEnv;
  version: string;
  port: number;
  processRole: "api" | "worker";
  logLevel: string;
  /** `migrationUrl`: role pemilik skema untuk runner migrasi dan reset (technical-specs 06 §6.12 MS-03). */
  database: { url: string; migrationUrl: string | null; poolMax: number };
  storage: {
    /** Endpoint internal untuk api dan worker, contoh `http://storage:9000`. */
    endpoint: string;
    /**
     * Endpoint yang dijangkau browser untuk URL unduhan bertanda tangan, contoh `https://files.${DOMAIN}` (issue #102).
     * Tanda tangan SigV4 memuat host, jadi proxy di depannya meneruskan header Host apa adanya.
     */
    publicEndpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
  /** Gotenberg; probe `pdfConverter` dilewati bila kosong. */
  gotenbergUrl: string | null;
  /** Atribut `Secure` cookie sesi; `false` hanya di dev (technical-specs 11 §11.3). */
  sessionCookieSecure: boolean;
  monitoringToken: string;
  /**
   * Terisi hanya bila rute reset-state boleh didaftarkan (technical-specs 07 §7.8). `seedUserPassword` adalah
   * password akun seed dev dan qa dari vault (DEPLOYMENT_PLAN §6.5).
   */
  resetApi: { token: string; defaultSeed: "dev" | "qa"; seedUserPassword: string } | null;
  /** Adapter simulasi boleh dipanggil Integration Registry (IN-03, technical-specs 11 §11.2). */
  allowSimulationAdapters: boolean;
  /**
   * Penyedia data wilayah Oksara (technical-specs 11 §11.2). `apiKey` kosong berarti adapter simulasi, yang hanya
   * boleh bila `allowSimulationAdapters`.
   */
  regionApi: { url: string; apiKey: string | null };
  /**
   * Relay SMTP email nasabah (technical-specs 11 §11.2); Mailpit di dev, tanpa akun. `null` hanya di konfigurasi uji,
   * yang memakai adapter email memori (technical-specs 04, tabel adapter per lingkungan).
   */
  smtp: SmtpConfig | null;
  /** Konsumen pg-boss per antrean di proses worker. */
  worker: { concurrency: number };
  /**
   * Kunci publik Ed25519 PEM untuk memverifikasi lisensi (technical-specs 07 §7.6). Tertanam di image saat build
   * oleh `tools/package-builder`, tidak pernah dibaca dari env; uji menggantinya dengan kunci uji.
   */
  licensePublicKey: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** `null`: relay tanpa autentikasi, contoh Mailpit. */
  auth: { user: string; password: string } | null;
  from: string;
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
    masterKey: readMasterKey(env.MASTER_KEY_FILE),
    appEnv: env.APP_ENV,
    version: env.APP_VERSION,
    port: env.PORT,
    processRole: env.PROCESS_ROLE,
    logLevel: env.LOG_LEVEL,
    database: {
      url: env.DATABASE_URL,
      migrationUrl: env.DATABASE_MIGRATION_URL ?? null,
      poolMax: env.DATABASE_POOL_MAX,
    },
    storage: {
      endpoint: env.S3_ENDPOINT,
      publicEndpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKey: readSecret(env.S3_ACCESS_KEY_FILE),
      secretKey: readSecret(env.S3_SECRET_KEY_FILE),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    gotenbergUrl: env.GOTENBERG_URL ?? null,
    sessionCookieSecure: env.SESSION_COOKIE_SECURE,
    monitoringToken: readSecret(env.MONITORING_TOKEN_FILE),
    resetApi:
      resetAllowed && env.RESET_API_TOKEN_FILE && env.SEED_USER_PASSWORD_FILE
        ? {
            token: readSecret(env.RESET_API_TOKEN_FILE),
            defaultSeed: env.DEFAULT_RESET_SEED,
            seedUserPassword: readSecret(env.SEED_USER_PASSWORD_FILE),
          }
        : null,
    allowSimulationAdapters: env.ALLOW_SIMULATION_ADAPTERS,
    regionApi: {
      url: env.REGION_API_URL,
      apiKey: env.REGION_API_KEY_FILE ? readSecret(env.REGION_API_KEY_FILE) : null,
    },
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD_FILE
          ? { user: env.SMTP_USER, password: readSecret(env.SMTP_PASSWORD_FILE) }
          : null,
      from: env.SMTP_FROM,
    },
    worker: { concurrency: env.WORKER_CONCURRENCY },
    licensePublicKey: licensePublicKeyPem,
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");
