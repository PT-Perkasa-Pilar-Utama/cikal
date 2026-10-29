import { Global, Module } from "@nestjs/common";
import { AUDIT_PORT } from "../../../platform/http/audit-port.js";
import { AuditLogItems } from "./application/audit-log-items.js";
import { AuditTrail } from "./application/audit-trail.js";
import { GetAuditLogUseCase } from "./application/get-audit-log.use-case.js";
import { ListAuditLogsUseCase } from "./application/list-audit-logs.use-case.js";
import { AuditLogsRepository } from "./db/audit-logs.repository.js";
import { AuditLogsController } from "./http/audit-logs.controller.js";

/**
 * Audit: jejak audit append-only dan halaman "Audit Trail" (technical-specs 05 §5.7, api-specs 17 §17.2). Global
 * karena mendaftarkan `AUDIT_PORT` untuk modul dasar yang tidak boleh mengimpor modul ini.
 */
@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditLogsRepository,
    AuditTrail,
    AuditLogItems,
    ListAuditLogsUseCase,
    GetAuditLogUseCase,
    { provide: AUDIT_PORT, useExisting: AuditTrail },
  ],
  exports: [AuditTrail, AUDIT_PORT],
})
export class AuditModule {}
