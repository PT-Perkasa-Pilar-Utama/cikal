import type { EndOfMonthRule, FormulaValue } from "@cikal/formula";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { FormulaExecutionLogsRepository } from "../db/formula-execution-logs.repository.js";
import type { FormulaCode } from "../domain/default-formulas.js";
import { type FormulaEnvironment, FormulaRun } from "../domain/formula-run.js";
import {
  type InstallmentSchedule,
  type InstallmentTerms,
  installmentSchedule,
} from "../domain/installment-schedule.js";

/** Penanda versi rumus default bawaan di `formulaVersions` (FM-04, FM-05). */
export const DEFAULT_FORMULA_VERSION = "DEFAULT";

/** Pemanggil perhitungan; `applicationId` dan `processInstanceId` diisi untuk perhitungan pengajuan (FM-08). */
export interface CalculationContext {
  tenantId: string;
  productId?: string;
  applicationId?: string;
  processInstanceId?: string;
}

export interface ScheduleResult extends InstallmentSchedule {
  /** Kode rumus ke id versi yang dipakai, atau `DEFAULT` untuk rumus bawaan. */
  formulaVersions: Record<string, string>;
}

const isEndOfMonthRule = (value: string | null): value is EndOfMonthRule =>
  value === "LAST_DAY" || value === "NEXT_MONTH_FIRST_DAY";

/**
 * Layanan perhitungan CORE Calculation (technical-specs 05 §5.16) untuk RAC, approval, dan simulasi angsuran.
 * Setiap evaluasi dicatat ke `formula_execution_logs` di transaksi sendiri, sehingga log error tetap tersimpan
 * walaupun transaksi pemanggil batal (FM-08, FM-09).
 */
@Injectable()
export class CalculationApi {
  constructor(
    private readonly db: TenantTx,
    private readonly logs: FormulaExecutionLogsRepository,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  /** `evaluate(formulaCode, ctx)`; error rumus dilempar `422 FORMULA_ERROR` tanpa nilai pengganti. */
  evaluate(ctx: CalculationContext, code: FormulaCode, variables: Record<string, FormulaValue>): Promise<FormulaValue> {
    return this.logged(ctx, {}, (run) => run.evaluate(code, variables));
  }

  /** `schedule(principal, tenor, rate, type, firstDate)`: jadwal angsuran Flat atau Effective (RM-19). */
  async schedule(ctx: CalculationContext, terms: InstallmentTerms): Promise<ScheduleResult> {
    const endOfMonth = await this.endOfMonthRule(ctx);
    const schedule = await this.logged(ctx, { endOfMonth }, (run) => installmentSchedule(run, terms));
    const formulaVersions = Object.fromEntries(schedule.formulaCodes.map((code) => [code, DEFAULT_FORMULA_VERSION]));
    return { ...schedule, formulaVersions };
  }

  private async endOfMonthRule(ctx: CalculationContext): Promise<EndOfMonthRule> {
    const value = await this.db.withSystemTx(ctx.tenantId, (tx) =>
      this.parameters.value(tx, "DUE_DATE_END_OF_MONTH", ctx.productId),
    );
    if (!isEndOfMonthRule(value)) throw new Error(`DUE_DATE_END_OF_MONTH has an unknown value ${String(value)}`);
    return value;
  }

  private async logged<T>(ctx: CalculationContext, env: FormulaEnvironment, work: (run: FormulaRun) => T): Promise<T> {
    const run = new FormulaRun(env);
    const executedAt = new Date();
    try {
      return work(run);
    } finally {
      await this.db.withSystemTx(ctx.tenantId, (tx) =>
        this.logs.insertMany(
          tx,
          run.executions.map((execution) => ({
            id: uuidv7(),
            tenantId: ctx.tenantId,
            applicationId: ctx.applicationId ?? null,
            processInstanceId: ctx.processInstanceId ?? null,
            executedAt,
            ...execution,
          })),
        ),
      );
    }
  }
}
