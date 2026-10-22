import { Injectable } from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import { collectDefaultMetrics, Histogram, Registry } from "prom-client";

/** Metrik Prometheus (api-specs 27 §27.3). Registry per aplikasi agar beberapa instance uji tidak bertabrakan. */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly requestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Durasi request HTTP per route dan status",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  /** Mencatat setiap respons lewat hook Fastify; route memakai pola (`/api/v1/products/:id`), bukan URL mentah. */
  instrument(fastify: FastifyInstance): void {
    fastify.addHook("onResponse", async (request, reply) => {
      this.requestDuration.observe(
        {
          method: request.method,
          route: request.routeOptions.url ?? "unmatched",
          status_code: String(reply.statusCode),
        },
        reply.elapsedTime / 1000,
      );
    });
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}
