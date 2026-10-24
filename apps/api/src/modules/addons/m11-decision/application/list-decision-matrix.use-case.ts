import type { DecisionMatrixListQuery, DecisionMatrixListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { MatrixChecks } from "./matrix-checks.js";

/** Halaman "Decision Matrix": baris urut prioritas dengan tanda perubahan menunggu (api-specs 24 §24.2). */
@Injectable()
export class ListDecisionMatrixUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly rows: DecisionMatrixRepository,
    private readonly checks: MatrixChecks,
  ) {}

  execute(ctx: RequestContext, query: DecisionMatrixListQuery): Promise<DecisionMatrixListResponse> {
    const { decisionOutcome, page, pageSize } = query;
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.rows.list(tx, decisionOutcome, { offset: (page - 1) * pageSize, limit: pageSize });
      const totalItems = await this.rows.count(tx, decisionOutcome);
      const pending = await this.checks.pendingIds(
        tx,
        rows.map((row) => row.id),
      );
      return {
        data: rows.map((row) => ({ ...row, hasPendingChange: pending.has(row.id) })),
        meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
      };
    });
  }
}
