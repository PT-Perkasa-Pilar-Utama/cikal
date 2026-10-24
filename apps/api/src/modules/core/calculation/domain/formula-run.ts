import {
  type EvaluationContext,
  evaluateFormula,
  FormulaError,
  type FormulaValue,
  isoDate,
  parseFormula,
  referencedVariables,
  roundDecimal,
} from "@cikal/formula";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { defaultFormulas, type FormulaCode, isFormulaCode } from "./default-formulas.js";

/** Satu baris FormulaExecutionLog (FM-08); `formulaVersionId` kosong berarti rumus default bawaan. */
export interface FormulaExecution {
  formulaCode: FormulaCode;
  formulaVersionId: string | null;
  inputValues: Record<string, string | boolean>;
  result: string | null;
  status: "SUCCESS" | "ERROR";
  errorMessage: string | null;
}

export type FormulaEnvironment = Omit<EvaluationContext, "variables">;

const serialize = (value: FormulaValue): string | boolean =>
  value instanceof Decimal ? value.toString() : value instanceof Date ? isoDate(value) : value;

/** `422 FORMULA_ERROR` dengan kode rumus di `details` (api-specs 09 §9.1). */
export function formulaFailure(code: FormulaCode, message: string): DomainError {
  return new DomainError("FORMULA_ERROR", message, 422, [{ field: code, code: "FORMULA_ERROR", message }]);
}

/**
 * Satu rangkaian evaluasi rumus. Variabel yang merupakan kode rumus lain dihitung lebih dulu (FM-03; rumus default
 * tidak saling merujuk melingkar). Setiap evaluasi, termasuk yang gagal, dicatat di `executions` (FM-08).
 */
export class FormulaRun {
  readonly executions: FormulaExecution[] = [];

  constructor(private readonly env: FormulaEnvironment) {}

  /** Rumus ber-`resultType` MONEY atau PERCENT, sudah dibulatkan (FM-07). */
  number(code: FormulaCode, variables: Readonly<Record<string, FormulaValue>>): Decimal {
    const value = this.evaluate(code, variables);
    if (value instanceof Decimal) return value;
    throw formulaFailure(code, `Formula ${code} must return a number`);
  }

  /** Rumus ber-`resultType` DATE. */
  date(code: FormulaCode, variables: Readonly<Record<string, FormulaValue>>): Date {
    const value = this.evaluate(code, variables);
    if (value instanceof Date) return value;
    throw formulaFailure(code, `Formula ${code} must return a date`);
  }

  evaluate(code: FormulaCode, variables: Readonly<Record<string, FormulaValue>>): FormulaValue {
    const definition = defaultFormulas[code];
    const inputs: Record<string, FormulaValue> = {};
    try {
      for (const name of referencedVariables(parseFormula(definition.expression))) {
        const value = isFormulaCode(name) ? this.evaluate(name, variables) : variables[name];
        if (value !== undefined) inputs[name] = value;
      }
      const raw = evaluateFormula(definition.expression, { ...this.env, variables: inputs });
      const result = this.shape(code, raw);
      this.record(code, inputs, { result: serialize(result).toString(), status: "SUCCESS", errorMessage: null });
      return result;
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error;
      this.record(code, inputs, { result: null, status: "ERROR", errorMessage: error.message });
      throw formulaFailure(code, error.message);
    }
  }

  private shape(code: FormulaCode, value: FormulaValue): FormulaValue {
    const { resultType, rounding } = defaultFormulas[code];
    if (resultType === "DATE") {
      if (value instanceof Date) return value;
      throw new FormulaError(`Formula ${code} must return a date`);
    }
    if (!(value instanceof Decimal)) throw new FormulaError(`Formula ${code} must return a number`);
    return rounding ? roundDecimal(value, rounding.scale, rounding.mode) : value;
  }

  private record(
    code: FormulaCode,
    inputs: Record<string, FormulaValue>,
    outcome: Pick<FormulaExecution, "result" | "status" | "errorMessage">,
  ): void {
    const inputValues = Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, serialize(value)]));
    this.executions.push({ formulaCode: code, formulaVersionId: null, inputValues, ...outcome });
  }
}
