import { existsSync } from "node:fs";
import { Logger } from "@nestjs/common";
import { createWorkerContext } from "./app.factory.js";
import { loadConfig } from "./platform/config/config.js";
import { OpsSignals } from "./platform/ops/ops-signals.js";
import { JobQueue } from "./platform/queue/job-queue.js";

if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

/** Entrypoint konsumen pg-boss (technical-specs 03 §3.1); konsumen didaftarkan modul lewat `JobQueue.consume`. */
const config = loadConfig();
const logger = new Logger("Worker");
const app = await createWorkerContext(config);
const queue = app.get(JobQueue);

// Reset state (api-specs 27 §27.4): konsumen berhenti saat reset_started dan menyala lagi saat reset_finished.
// Konsumen yang gagal menyala lagi menghentikan proses agar Docker memulainya ulang (restart policy).
// Sinyal lain (contoh license_installed) ditangani penerimanya sendiri.
app.get(OpsSignals).on((signal) => {
  if (signal !== "reset_started" && signal !== "reset_finished") return;
  logger.log(`Ops signal ${signal}`);
  const action = signal === "reset_started" ? queue.stopConsumers() : queue.startConsumers();
  action.catch((error: unknown) => {
    logger.error(`Consumers failed after ${signal}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
});

await queue.startConsumers();
logger.log(`Worker ${config.version} started in ${config.appEnv}`);
