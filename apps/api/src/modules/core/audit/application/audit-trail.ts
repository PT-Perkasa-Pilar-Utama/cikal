import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { AuditLogsRepository } from "../db/audit-logs.repository.js";
import type { AuditEvent } from "../domain/audit-entry.js";

/**
 * `audit.record(event)` (technical-specs 05 §5.7). Ditulis di transaksi pemanggil sehingga aksi dan jejaknya
 * commit atau batal bersama (CODING_STANDARD §6.2). Role dicatat sesuai role pelaku saat aksi.
 */
@Injectable()
export class AuditTrail {
  constructor(
    private readonly logs: AuditLogsRepository,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  async record(tx: Tx, actor: Actor, event: AuditEvent): Promise<void> {
    const user = (await this.users.describe(tx, [actor.userId])).get(actor.userId);
    await this.logs.insert(tx, {
      id: uuidv7(),
      tenantId: actor.tenantId,
      userId: actor.userId,
      role: user?.roleName ?? null,
      module: event.module,
      action: event.action,
      recordId: event.recordId ?? null,
      description: event.description ?? null,
      oldData: event.oldData ?? null,
      newData: event.newData ?? null,
      ipAddress: actor.ipAddress,
      createdBy: actor.userId,
    });
  }
}
