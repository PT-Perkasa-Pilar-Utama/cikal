import "reflect-metadata";
import fastifyCookie from "@fastify/cookie";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import type { AppConfig } from "./platform/config/config.js";
import { MetricsService } from "./platform/ops/metrics.service.js";

/** Satu titik pembuatan aplikasi untuk `main.ts` dan uji. */
export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(config),
    new FastifyAdapter({ bodyLimit: 1_048_576, trustProxy: true }),
    { logger: config.appEnv === "test" ? false : ["log", "warn", "error"] },
  );
  // Cookie sesi dan CSRF web dibaca guard (api-specs 02 §2.1).
  await app.register(fastifyCookie);
  app.setGlobalPrefix("api");
  app.get(MetricsService).instrument(app.getHttpAdapter().getInstance());
  app.enableShutdownHooks();
  return app;
}
