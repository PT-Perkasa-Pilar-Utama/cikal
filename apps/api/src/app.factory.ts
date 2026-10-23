import "reflect-metadata";
import fastifyCookie from "@fastify/cookie";
import type { INestApplicationContext, LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import type { AppConfig } from "./platform/config/config.js";
import { registerMultipart } from "./platform/http/multipart.js";
import { MetricsService } from "./platform/ops/metrics.service.js";

const loggerLevels = (config: AppConfig): LogLevel[] | false =>
  config.appEnv === "test" ? false : ["log", "warn", "error"];

/** Satu titik pembuatan aplikasi untuk `main.ts` dan uji. */
export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(config),
    new FastifyAdapter({ bodyLimit: 1_048_576, trustProxy: true }),
    { logger: loggerLevels(config) },
  );
  // Cookie sesi dan CSRF web dibaca guard (api-specs 02 §2.1).
  await app.register(fastifyCookie);
  await registerMultipart(app);
  app.setGlobalPrefix("api");
  app.get(MetricsService).instrument(app.getHttpAdapter().getInstance());
  app.enableShutdownHooks();
  return app;
}

/** Konteks aplikasi tanpa HTTP untuk `worker.ts` dan uji konsumen job (technical-specs 02 §2.1). */
export async function createWorkerContext(config: AppConfig): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule.forRoot(config), { logger: loggerLevels(config) });
  app.enableShutdownHooks();
  return app;
}
