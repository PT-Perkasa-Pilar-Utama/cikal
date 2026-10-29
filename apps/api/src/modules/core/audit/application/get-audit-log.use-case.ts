import type { AuditLogDetailResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { AuditLogsRepository } from "../db/audit-logs.repository.js";
import { asRecord, changedFields } from "../domain/audit-search.js";
import { AuditLogItems } from "./audit-log-items.js";

/** Detail satu jejak audit: data sebelum dan sesudah serta field yang berubah (api-specs 17 §17.3, AC-14.02). */
@Injectable()
export class GetAuditLogUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly logs: AuditLogsRepository,
    private readonly items: AuditLogItems,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<AuditLogDetailResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const row = await this.logs.findById(tx, id);
      if (!row) throw DomainError.standard("NOT_FOUND");
      const [item] = await this.items.toItems(tx, [row]);
      if (!item) throw DomainError.standard("NOT_FOUND");
      const oldData = asRecord(row.oldData);
      const newData = asRecord(row.newData);
      return { data: { ...item, oldData, newData, changedFields: changedFields(oldData, newData) } };
    });
  }
}
