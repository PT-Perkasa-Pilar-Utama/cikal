import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { formulaExecutionLogs } from "./schema.js";

export type ExecutionLogInsert = typeof formulaExecutionLogs.$inferInsert;

/** Akses tabel `calculation.formula_execution_logs`; hanya tambah baris (FM-08). */
@Injectable()
export class FormulaExecutionLogsRepository {
  async insertMany(tx: Tx, rows: readonly ExecutionLogInsert[]): Promise<void> {
    if (rows.length === 0) return;
    await tx.insert(formulaExecutionLogs).values([...rows]);
  }
}
