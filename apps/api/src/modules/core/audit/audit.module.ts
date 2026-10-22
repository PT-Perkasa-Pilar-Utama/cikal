import { Module } from "@nestjs/common";
import { AuditTrail } from "./application/audit-trail.js";
import { AuditLogsRepository } from "./db/audit-logs.repository.js";

/** Audit: jejak audit append-only (technical-specs 05 §5.7). */
@Module({
  providers: [AuditLogsRepository, AuditTrail],
  exports: [AuditTrail],
})
export class AuditModule {}
