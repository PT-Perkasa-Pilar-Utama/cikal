import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DomainError } from "../http/domain-error.js";

const PRIVATE_V4 = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

/** Sumber jaringan internal. Nginx membatasi rute ini ke subnet monitoring (technical-specs 07 §7.8). */
export function isInternalAddress(address: string): boolean {
  const ip = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(ip) === 4) return PRIVATE_V4.some((range) => range.test(ip));
  return ip === "::1" || ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd");
}

export function tokenMatches(expected: string, header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/** `GET /api/health/ready` dan `/api/metrics`: jaringan internal atau `Bearer <MONITORING_TOKEN>`. */
@Injectable()
export class MonitoringGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (tokenMatches(this.config.monitoringToken, request.headers.authorization)) return true;
    if (isInternalAddress(request.ip)) return true;
    throw DomainError.standard("UNAUTHENTICATED");
  }
}
