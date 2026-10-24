import { Decimal } from "decimal.js";
import { addMonths, addWorkdays, dateDiff, type EndOfMonthRule, endOfMonth } from "./dates.js";
import { ipmt, pmt, ppmt, pv } from "./financial.js";
import type { FormulaFunction } from "./parse.js";
import { asDate, asInteger, asNumber, asText, FormulaError, type FormulaValue } from "./values.js";

/** Data luar yang boleh dibaca fungsi; diisi pemanggil, bukan diambil rumus sendiri (FM-02). */
export interface FunctionEnvironment {
  endOfMonth: EndOfMonthRule;
  holidays: readonly Date[];
  /** Tabel tarif terdaftar untuk `LOOKUP(table, key)`. */
  lookups: Readonly<Record<string, Readonly<Record<string, FormulaValue>>>>;
}

type Implementation = (args: FormulaValue[], env: FunctionEnvironment) => FormulaValue;

function arity(name: string, args: readonly FormulaValue[], min: number, max = min): void {
  if (args.length < min || args.length > max) {
    const expected = min === max ? `${min}` : `${min} to ${max}`;
    throw new FormulaError(`${name} expects ${expected} arguments, got ${args.length}`);
  }
}

function at(args: readonly FormulaValue[], index: number): FormulaValue {
  const value = args[index];
  if (value === undefined) throw new FormulaError(`Argument ${index + 1} is missing`);
  return value;
}

const numbers = (name: string, args: readonly FormulaValue[]): Decimal[] => {
  if (args.length === 0) throw new FormulaError(`${name} expects at least 1 argument`);
  return args.map((arg, index) => asNumber(arg, `${name} argument ${index + 1}`));
};

const rounder =
  (name: string, mode: Decimal.Rounding): Implementation =>
  (args) => {
    arity(name, args, 2);
    const scale = asInteger(at(args, 1), `${name} scale`);
    if (scale < 0) throw new FormulaError(`${name} scale must not be negative`);
    return asNumber(at(args, 0), name).toDecimalPlaces(scale, mode);
  };

/** Implementasi fungsi selain `IF`, yang dievaluasi malas oleh evaluator. */
export const implementations: Record<Exclude<FormulaFunction, "IF">, Implementation> = {
  MIN: (args) => Decimal.min(...numbers("MIN", args)),
  MAX: (args) => Decimal.max(...numbers("MAX", args)),
  ABS: (args) => {
    arity("ABS", args, 1);
    return asNumber(at(args, 0), "ABS").abs();
  },
  ROUND: rounder("ROUND", Decimal.ROUND_HALF_UP),
  ROUNDUP: rounder("ROUNDUP", Decimal.ROUND_UP),
  ROUNDDOWN: rounder("ROUNDDOWN", Decimal.ROUND_DOWN),
  PMT: (args) => {
    arity("PMT", args, 3);
    return pmt(asNumber(at(args, 0), "PMT rate"), asInteger(at(args, 1), "PMT nper"), asNumber(at(args, 2), "PMT pv"));
  },
  IPMT: (args) => {
    arity("IPMT", args, 4);
    const [rate, per, nper, value] = [at(args, 0), at(args, 1), at(args, 2), at(args, 3)];
    return ipmt(
      asNumber(rate, "IPMT rate"),
      asInteger(per, "IPMT per"),
      asInteger(nper, "IPMT nper"),
      asNumber(value, "IPMT pv"),
    );
  },
  PPMT: (args) => {
    arity("PPMT", args, 4);
    const [rate, per, nper, value] = [at(args, 0), at(args, 1), at(args, 2), at(args, 3)];
    return ppmt(
      asNumber(rate, "PPMT rate"),
      asInteger(per, "PPMT per"),
      asInteger(nper, "PPMT nper"),
      asNumber(value, "PPMT pv"),
    );
  },
  PV: (args) => {
    arity("PV", args, 3);
    return pv(asNumber(at(args, 0), "PV rate"), asInteger(at(args, 1), "PV nper"), asNumber(at(args, 2), "PV pmt"));
  },
  DATEDIFF: (args) => {
    arity("DATEDIFF", args, 3);
    const days = dateDiff(
      asDate(at(args, 0), "DATEDIFF start"),
      asDate(at(args, 1), "DATEDIFF end"),
      asText(at(args, 2), "DATEDIFF unit"),
    );
    return new Decimal(days);
  },
  ADDMONTHS: (args, env) => {
    arity("ADDMONTHS", args, 2);
    return addMonths(asDate(at(args, 0), "ADDMONTHS date"), asInteger(at(args, 1), "ADDMONTHS months"), env.endOfMonth);
  },
  EOMONTH: (args) => {
    arity("EOMONTH", args, 2);
    return endOfMonth(asDate(at(args, 0), "EOMONTH date"), asInteger(at(args, 1), "EOMONTH months"));
  },
  WORKDAYS: (args, env) => {
    arity("WORKDAYS", args, 2);
    return addWorkdays(asDate(at(args, 0), "WORKDAYS date"), asInteger(at(args, 1), "WORKDAYS days"), env.holidays);
  },
  LOOKUP: (args, env) => {
    arity("LOOKUP", args, 2);
    const tableCode = asText(at(args, 0), "LOOKUP table");
    const table = env.lookups[tableCode];
    if (!table) throw new FormulaError(`Lookup table ${tableCode} is not registered`);
    const key = at(args, 1);
    const keyText = key instanceof Decimal ? key.toString() : asText(key, "LOOKUP key");
    const value = table[keyText];
    if (value === undefined) throw new FormulaError(`Lookup table ${tableCode} has no row ${keyText}`);
    return value;
  },
};
