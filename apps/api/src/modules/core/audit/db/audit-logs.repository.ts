import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { auditLogs } from "./schema.js";

export type AuditLogInsert = typeof auditLogs.$inferInsert;

/** Akses tabel `audit.audit_logs`; hanya menambah baris (technical-specs 05 §5.7). */
@Injectable()
export class AuditLogsRepository {
  async insert(tx: Tx, row: AuditLogInsert): Promise<void> {
    await tx.insert(auditLogs).values(row);
  }
}
