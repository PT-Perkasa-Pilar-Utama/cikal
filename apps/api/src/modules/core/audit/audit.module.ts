import { Global, Module } from "@nestjs/common";
import { AUDIT_PORT } from "../../../platform/http/audit-port.js";
import { AuditTrail } from "./application/audit-trail.js";
import { AuditLogsRepository } from "./db/audit-logs.repository.js";

/**
 * Audit: jejak audit append-only (technical-specs 05 §5.7). Global karena mendaftarkan `AUDIT_PORT` untuk modul
 * dasar yang tidak boleh mengimpor modul ini.
 */
@Global()
@Module({
  providers: [AuditLogsRepository, AuditTrail, { provide: AUDIT_PORT, useExisting: AuditTrail }],
  exports: [AuditTrail, AUDIT_PORT],
})
export class AuditModule {}
