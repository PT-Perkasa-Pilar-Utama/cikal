import type { ChangeRequestAccepted, DecisionMatrixRowInput } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../../core/change-request/index.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { DECISION_MATRIX_ENTITY_TYPE, MatrixChecks } from "./matrix-checks.js";

/** Maker mengubah satu baris Decision Matrix lewat ChangeRequest (api-specs 24 §24.2, AC-36.01). */
@Injectable()
export class RequestMatrixRowUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly rows: DecisionMatrixRepository,
    private readonly checks: MatrixChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, id: string, body: DecisionMatrixRowInput): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const current = await this.rows.findById(tx, id);
      if (!current) throw DomainError.standard("NOT_FOUND");
      await this.checks.assertNoPendingChange(tx, id);
      await this.checks.assertCombinationFree(tx, body, { excludeId: id, includePending: true });
      const { id: _id, ...oldData } = current;
      return this.changeRequests.submit(tx, ctx, {
        entityType: DECISION_MATRIX_ENTITY_TYPE,
        entityId: id,
        oldData,
        newData: { ...body, description: body.description ?? null },
      });
    });
  }
}
