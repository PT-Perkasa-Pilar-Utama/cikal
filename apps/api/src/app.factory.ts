import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import type { AppConfig } from "./platform/config/config.js";

/** Satu titik pembuatan aplikasi untuk `main.ts` dan uji. */
export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(config),
    new FastifyAdapter({ bodyLimit: 1_048_576, trustProxy: true }),
    { logger: config.appEnv === "test" ? false : ["log", "warn", "error"] },
  );
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  return app;
}
