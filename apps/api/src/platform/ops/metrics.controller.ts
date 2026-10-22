import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { Public } from "../http/access.js";
import { MetricsService } from "./metrics.service.js";
import { MonitoringGuard } from "./monitoring.guard.js";

/** `GET /api/metrics` (api-specs 27 §27.3); akses sama dengan `/api/health/ready`. */
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @UseGuards(MonitoringGuard)
  async render(@Res() reply: FastifyReply): Promise<void> {
    await reply.header("content-type", this.metrics.registry.contentType).send(await this.metrics.render());
  }
}
