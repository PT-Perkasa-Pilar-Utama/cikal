import { existsSync } from "node:fs";
import { Logger } from "@nestjs/common";
import { loadConfig } from "./platform/config/config.js";
import { listenOpsSignals } from "./platform/ops/ops-signals.js";

if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

/** Entrypoint konsumen pg-boss (technical-specs 03 §3.1). Konsumen job dipasang di kartu TL-S2-01. */
const config = loadConfig();
const logger = new Logger("Worker");
logger.log(`Worker ${config.version} started in ${config.appEnv}`);

// Reset state (api-specs 27 §27.4): konsumen berhenti saat reset_started dan menyala lagi saat reset_finished.
const stopListening = listenOpsSignals(config.database.url, (signal) => {
  logger.log(`Ops signal ${signal}`);
});

const stop = async () => {
  logger.log("Worker stopping");
  await stopListening();
  process.exit(0);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
setInterval(() => undefined, 60_000);
