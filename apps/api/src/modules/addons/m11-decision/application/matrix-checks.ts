import type { MatrixCombination } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../../core/change-request/index.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { matrixRowExists } from "../domain/decision-errors.js";

export const DECISION_MATRIX_ENTITY_TYPE = "DECISION_MATRIX";

/** Aturan bersama pengajuan dan persetujuan baris Decision Matrix (api-specs 24 §24.2). */
@Injectable()
export class MatrixChecks {
  constructor(
    private readonly rows: DecisionMatrixRepository,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  /** Kombinasi enam kolom tidak dipakai baris lain, dan saat pengajuan juga tidak sedang diajukan. */
  async assertCombinationFree(
    tx: Tx,
    combination: MatrixCombination,
    options: { excludeId: string | null; includePending: boolean },
  ): Promise<void> {
    const existing = await this.rows.findByCombination(tx, combination);
    if (existing && existing.id !== options.excludeId) throw matrixRowExists();
    const { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome } =
      combination;
    const fields = { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome };
    if (options.includePending && (await this.changeRequests.hasProposed(tx, DECISION_MATRIX_ENTITY_TYPE, fields))) {
      throw matrixRowExists();
    }
  }

  async assertNoPendingChange(tx: Tx, id: string): Promise<void> {
    if ((await this.pendingIds(tx, [id])).has(id)) throw DomainError.standard("PENDING_CHANGE_REQUEST");
  }

  pendingIds(tx: Tx, ids: readonly string[]): Promise<Set<string>> {
    return this.changeRequests.pendingEntityIds(tx, [DECISION_MATRIX_ENTITY_TYPE], ids);
  }
}
