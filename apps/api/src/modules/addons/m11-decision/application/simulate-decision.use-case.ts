import {
  type DecisionSimulationRequest,
  type DecisionSimulationResponse,
  decisionMatrixDataSchema,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../../core/change-request/index.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { requireAllOutcomes } from "../domain/decision-errors.js";
import { decide, type MatrixRule, place } from "../domain/matrix-rules.js";
import { DECISION_MATRIX_ENTITY_TYPE } from "./matrix-checks.js";

/**
 * Simulasi keputusan satu kombinasi (api-specs 24 §24.3, AC-36.02 s.d. AC-36.05). `PENDING` menguji matrix aktif
 * yang sudah ditimpa perubahan menunggu persetujuan, urut waktu diajukan; baris baru memakai id ChangeRequest-nya.
 */
@Injectable()
export class SimulateDecisionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly rows: DecisionMatrixRepository,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: DecisionSimulationRequest): Promise<DecisionSimulationResponse> {
    const outcomes = requireAllOutcomes(body);
    return this.db.withTenantTx(ctx, async (tx) => {
      const active = await this.rows.all(tx);
      const rules = body.useMatrix === "PENDING" ? await this.withPending(tx, active) : active;
      const { decisionOutcome, matchedRow, note } = decide(rules, outcomes);
      const matched = matchedRow && {
        id: matchedRow.id,
        priority: matchedRow.priority,
        dedupOutcome: matchedRow.dedupOutcome,
        dukcapilOutcome: matchedRow.dukcapilOutcome,
        fraudOutcome: matchedRow.fraudOutcome,
        racOutcome: matchedRow.racOutcome,
        scoringOutcome: matchedRow.scoringOutcome,
        creditBureauOutcome: matchedRow.creditBureauOutcome,
      };
      return { data: { decisionOutcome, matchedRow: matched, note } };
    });
  }

  private async withPending(tx: Tx, active: MatrixRule[]): Promise<MatrixRule[]> {
    const pending = await this.changeRequests.openRequests(tx, DECISION_MATRIX_ENTITY_TYPE);
    return pending.reduce<MatrixRule[]>(
      (rules, request) =>
        place(rules, { ...decisionMatrixDataSchema.parse(request.newData), id: request.entityId ?? request.id }),
      active,
    );
  }
}
