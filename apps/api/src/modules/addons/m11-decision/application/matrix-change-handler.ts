import {
  type DecisionMatrixData,
  decisionMatrixDataSchema,
  MATRIX_COLUMN_LABELS,
  MATRIX_COLUMNS,
  MATRIX_VALUE_LABELS,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type {
  ApplyResult,
  ChangeRequestSnapshot,
  EntityHandler,
  JsonRecord,
} from "../../../core/change-request/index.js";
import { DecisionMatrixRepository } from "../db/decision-matrix.repository.js";
import { place } from "../domain/matrix-rules.js";
import { DECISION_MATRIX_ENTITY_TYPE, MatrixChecks } from "./matrix-checks.js";

const label = (value: string): string => MATRIX_VALUE_LABELS[value] ?? value;

/** Nama baris "Pending Decision Matrix": prioritas, kolom selain `[ANY]`, dan keputusannya. */
export function matrixDisplayName(data: DecisionMatrixData): string {
  const columns = MATRIX_COLUMNS.filter((column) => data[column] !== "ANY").map(
    (column) => `${MATRIX_COLUMN_LABELS[column]} ${label(data[column])}`,
  );
  return `Priority ${data.priority}: ${columns.join(", ") || "[ANY]"} = ${label(data.decisionOutcome)}`;
}

/** Handler ChangeRequest `DECISION_MATRIX` (api-specs 07 §7.1, api-specs 24 §24.2). */
@Injectable()
export class MatrixChangeHandler implements EntityHandler {
  readonly entityType = DECISION_MATRIX_ENTITY_TYPE;
  readonly auditModule = "Decision Matrix";

  constructor(
    private readonly rows: DecisionMatrixRepository,
    private readonly checks: MatrixChecks,
  ) {}

  displayName(newData: JsonRecord): string {
    const data = decisionMatrixDataSchema.safeParse(newData);
    return data.success ? matrixDisplayName(data.data) : "";
  }

  /** Kombinasi masih bebas saat disetujui, dan baris yang diubah masih ada. */
  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = decisionMatrixDataSchema.parse(request.newData);
    if (request.entityId !== null && !(await this.rows.findById(tx, request.entityId))) {
      throw DomainError.standard("NOT_FOUND");
    }
    await this.checks.assertCombinationFree(tx, data, { excludeId: request.entityId, includePending: false });
  }

  /** Menulis baris lalu menggeser prioritas baris lain yang bertabrakan (api-specs 24 §24.2). */
  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = decisionMatrixDataSchema.parse(request.newData);
    const rule = { ...data, id: request.entityId ?? uuidv7() };
    const current = await this.rows.all(tx);
    const before = new Map(current.map((row) => [row.id, row.priority]));
    for (const row of place(current, rule)) {
      if (row.id === rule.id) continue;
      if (before.get(row.id) !== row.priority)
        await this.rows.updatePriority(tx, row.id, row.priority, reviewer.userId);
    }
    if (request.entityId === null) await this.rows.insert(tx, reviewer.tenantId, rule, reviewer.userId);
    else await this.rows.update(tx, rule, reviewer.userId);
    return { entityId: rule.id };
  }
}
