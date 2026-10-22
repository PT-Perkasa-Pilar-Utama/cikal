import { existsSync } from "node:fs";
import { createApp } from "./app.factory.js";
import { loadConfig } from "./platform/config/config.js";

if (!process.env.APP_ENV && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const config = loadConfig();
const app = await createApp(config);
await app.listen({ port: config.port, host: "0.0.0.0" });
