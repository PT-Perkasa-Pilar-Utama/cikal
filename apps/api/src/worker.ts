import { existsSync } from "node:fs";
import { Logger } from "@nestjs/common";
import { loadConfig } from "./platform/config/config.js";

if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

/** Entrypoint konsumen pg-boss (technical-specs 03 §3.1). Konsumen job dipasang di kartu TL-S2-01. */
const config = loadConfig();
const logger = new Logger("Worker");
logger.log(`Worker ${config.version} started in ${config.appEnv}`);

const stop = () => {
  logger.log("Worker stopping");
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
setInterval(() => undefined, 60_000);
