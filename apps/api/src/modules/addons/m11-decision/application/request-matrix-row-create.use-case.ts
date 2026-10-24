import type { ChangeRequestAccepted, DecisionMatrixRowInput } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../../core/change-request/index.js";
import { DECISION_MATRIX_ENTITY_TYPE, MatrixChecks } from "./matrix-checks.js";

/** Maker menambah baris Decision Matrix lewat ChangeRequest `DECISION_MATRIX` (api-specs 24 §24.2). */
@Injectable()
export class RequestMatrixRowCreateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checks: MatrixChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: DecisionMatrixRowInput): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.checks.assertCombinationFree(tx, body, { excludeId: null, includePending: true });
      return this.changeRequests.submit(tx, ctx, {
        entityType: DECISION_MATRIX_ENTITY_TYPE,
        entityId: null,
        oldData: null,
        newData: { ...body, description: body.description ?? null },
      });
    });
  }
}
