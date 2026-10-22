import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { Public } from "../http/access.js";
import { HealthService } from "./health.service.js";
import { MonitoringGuard } from "./monitoring.guard.js";

/** Endpoint operasional di luar versi API (api-specs 27 §27.1, §27.2). */
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get("live")
  @Public()
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  @Public()
  @UseGuards(MonitoringGuard)
  async ready(@Res() reply: FastifyReply): Promise<void> {
    const body = await this.health.ready();
    await reply.status(body.status === "down" ? 503 : 200).send(body);
  }
}
