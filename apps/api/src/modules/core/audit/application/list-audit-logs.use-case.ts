import type { AuditLogListResponse, AuditLogQuery } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AuditLogsRepository } from "../db/audit-logs.repository.js";
import { auditPeriodError } from "../domain/audit-search.js";
import { AuditLogItems } from "./audit-log-items.js";

/** Pencarian "Audit Trail" per periode, modul, jenis kejadian, user, dan record (api-specs 17 §17.2, AC-14.01). */
@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly logs: AuditLogsRepository,
    private readonly items: AuditLogItems,
  ) {}

  execute(ctx: RequestContext, query: AuditLogQuery): Promise<AuditLogListResponse> {
    const invalidPeriod = auditPeriodError(query.occurredFrom, query.occurredTo);
    if (invalidPeriod) throw invalidPeriod;
    const { occurredFrom, occurredTo, module, eventType, userId, recordId } = query;
    const filter = { occurredFrom, occurredTo, module, eventType, userId, recordId };
    const page = {
      direction: query.sort === "occurredAt,asc" ? "asc" : "desc",
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
    } as const;
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.logs.list(tx, filter, page);
      const totalItems = await this.logs.count(tx, filter);
      return {
        data: await this.items.toItems(tx, rows),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }
}
