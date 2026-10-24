import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { evaluateFormula } from "./evaluate.js";
import { FormulaError } from "./values.js";

const num = (value: string | number) => new Decimal(value);
const date = (iso: string) => new Date(`${iso}T00:00:00Z`);
const run = (expression: string, variables: Record<string, Decimal | string | boolean | Date> = {}) =>
  evaluateFormula(expression, { variables });

describe("evaluateFormula", () => {
  it("computes decimals without float drift", () => {
    expect(run("0.1 + 0.2")).toEqual(num("0.3"));
    expect(run("loanAmount * provisionFee / 100", { loanAmount: num("100000000"), provisionFee: num("1.5") })).toEqual(
      num("1500000"),
    );
  });

  it("evaluates comparisons, logic, and IF lazily", () => {
    expect(run("IF(a > 0 AND NOT b, 1, 1 / 0)", { a: num(1), b: false })).toEqual(num(1));
    expect(run("a == 'KTA' OR a == 'KPR'", { a: "KPR" })).toBe(true);
    expect(run("d1 < d2", { d1: date("2026-01-01"), d2: date("2026-02-01") })).toBe(true);
  });

  it("supports the rounding and aggregate functions", () => {
    expect(run("ROUND(2.5, 0)")).toEqual(num(3));
    expect(run("ROUNDUP(2.01, 0)")).toEqual(num(3));
    expect(run("ROUNDDOWN(2.99, 0)")).toEqual(num(2));
    expect(run("MAX(1, 5, 3) - MIN(4, 2) + ABS(-1)")).toEqual(num(4));
  });

  it("supports the financial functions with the Excel sign convention", () => {
    const pmt = run("ROUND(PMT(0.01, 12, -100000000), 0)");
    expect(pmt).toEqual(num("8884879"));
    expect(run("ROUND(IPMT(0.01, 1, 12, -100000000), 0)")).toEqual(num("1000000"));
    expect(run("ROUND(PPMT(0.01, 1, 12, -100000000), 0)")).toEqual(num("7884879"));
    expect(run("ROUND(PV(0.01, 12, -PMT(0.01, 12, -100000000)), 0)")).toEqual(num("100000000"));
    expect(run("PMT(0, 12, -12000000)")).toEqual(num("1000000"));
  });

  it("supports the date functions", () => {
    const start = date("2026-01-31");
    expect(run("ADDMONTHS(d, 1)", { d: start })).toEqual(date("2026-02-28"));
    expect(evaluateFormula("ADDMONTHS(d, 1)", { variables: { d: start }, endOfMonth: "NEXT_MONTH_FIRST_DAY" })).toEqual(
      date("2026-03-01"),
    );
    expect(run("EOMONTH(d, 1)", { d: date("2026-01-15") })).toEqual(date("2026-02-28"));
    expect(run("DATEDIFF(a, b, 'YEAR')", { a: date("1990-05-10"), b: date("2026-05-09") })).toEqual(num(35));
    expect(run("DATEDIFF(a, b, 'DAY')", { a: date("2026-01-01"), b: date("2026-01-31") })).toEqual(num(30));
    const holidays = [date("2026-01-05")];
    expect(evaluateFormula("WORKDAYS(d, 2)", { variables: { d: date("2026-01-02") }, holidays })).toEqual(
      date("2026-01-07"),
    );
  });

  it("reads registered lookup tables only", () => {
    const lookups = { INSURANCE_RATE: { "12": num("0.5") } };
    expect(evaluateFormula("LOOKUP('INSURANCE_RATE', tenor)", { variables: { tenor: num(12) }, lookups })).toEqual(
      num("0.5"),
    );
    expect(() => evaluateFormula("LOOKUP('OTHER', 1)", { variables: {}, lookups })).toThrow(
      "Lookup table OTHER is not registered",
    );
  });

  it("rejects division by zero and missing variables instead of defaulting (FM-09)", () => {
    expect(() => run("1 / x", { x: num(0) })).toThrow(new FormulaError("Division by zero"));
    expect(() => run("loanAmount + 1")).toThrow("Variable loanAmount has no value");
  });

  it("rejects type mismatches", () => {
    expect(() => run("'a' + 1")).toThrow("Left side of + must be a number");
    expect(() => run("IF(1, 2, 3)")).toThrow("IF condition must be true or false");
  });

  it("rejects nodes, operators, and functions outside the whitelist (FM-02)", () => {
    expect(() => run("process.exit(1)")).toThrow(FormulaError);
    expect(() => run("eval('1')")).toThrow("Function eval is not allowed");
    expect(() => run("a % 2", { a: num(4) })).toThrow("Expression BinaryExpression % is not allowed");
    expect(() => run("[1, 2]")).toThrow("Expression ArrayExpression is not allowed");
    expect(() => run("1 +")).toThrow(FormulaError);
  });

  it("rejects expressions nested deeper than 50 levels", () => {
    const deep = `${"ABS(".repeat(51)}1${")".repeat(51)}`;
    expect(() => run(deep)).toThrow("Formula is nested deeper than 50 levels");
  });
});
