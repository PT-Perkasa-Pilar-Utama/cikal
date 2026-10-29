import type { AuditLogItem } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import type { AuditLogRow } from "../db/audit-logs.repository.js";
import { auditEventType } from "../domain/audit-event-type.js";

/** Baris `audit_logs` menjadi baris "Audit Trail" dengan username pelaku (api-specs 17 §17.2). */
@Injectable()
export class AuditLogItems {
  constructor(@Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort) {}

  async toItems(tx: Tx, rows: readonly AuditLogRow[]): Promise<AuditLogItem[]> {
    const userIds = [...new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))];
    const users = await this.users.describe(tx, userIds);
    return rows.map((row) => {
      const user = row.userId ? users.get(row.userId) : undefined;
      return {
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        user: user ? { username: user.username } : null,
        role: row.role,
        module: row.module,
        eventType: auditEventType(row.module, row.action),
        action: row.action,
        recordId: row.recordId,
        description: row.description,
        ipAddress: row.ipAddress,
      };
    });
  }
}
