import { Decimal } from "decimal.js";
import type { EndOfMonthRule } from "./dates.js";
import { type FunctionEnvironment, implementations } from "./functions.js";
import { type BinaryOperator, type FormulaNode, parseFormula } from "./parse.js";
import { asBoolean, asNumber, FormulaError, type FormulaValue } from "./values.js";

/** Batas waktu satu evaluasi (technical-specs 07 §7.5, FM-02). */
const TIME_LIMIT_MS = 50;

export interface EvaluationContext {
  /** Nilai variabel katalog; variabel yang tidak diisi adalah error, bukan nol (FM-09). */
  variables: Readonly<Record<string, FormulaValue>>;
  endOfMonth?: EndOfMonthRule;
  holidays?: readonly Date[];
  lookups?: FunctionEnvironment["lookups"];
}

interface Run {
  variables: EvaluationContext["variables"];
  env: FunctionEnvironment;
  deadline: number;
}

function compare(operator: BinaryOperator, left: FormulaValue, right: FormulaValue): boolean {
  if (left instanceof Decimal && right instanceof Decimal) return order(operator, left.cmp(right));
  if (left instanceof Date && right instanceof Date)
    return order(operator, Math.sign(left.getTime() - right.getTime()));
  const primitive = typeof left === "string" || typeof left === "boolean";
  if (primitive && typeof left === typeof right && (operator === "==" || operator === "!=")) {
    return operator === "==" ? left === right : left !== right;
  }
  throw new FormulaError(`Operator ${operator} cannot compare these values`);
}

function order(operator: BinaryOperator, sign: number): boolean {
  switch (operator) {
    case "==":
      return sign === 0;
    case "!=":
      return sign !== 0;
    case "<":
      return sign < 0;
    case ">":
      return sign > 0;
    case "<=":
      return sign <= 0;
    default:
      return sign >= 0;
  }
}

function arithmetic(operator: "+" | "-" | "*" | "/", left: FormulaValue, right: FormulaValue): Decimal {
  const a = asNumber(left, `Left side of ${operator}`);
  const b = asNumber(right, `Right side of ${operator}`);
  switch (operator) {
    case "+":
      return a.plus(b);
    case "-":
      return a.minus(b);
    case "*":
      return a.mul(b);
    case "/":
      if (b.isZero()) throw new FormulaError("Division by zero");
      return a.div(b);
  }
}

function binary(node: Extract<FormulaNode, { kind: "binary" }>, run: Run): FormulaValue {
  const { operator } = node;
  if (operator === "AND" || operator === "OR") {
    const left = asBoolean(evaluateNode(node.left, run), `Left side of ${operator}`);
    if (operator === "AND" ? !left : left) return left;
    return asBoolean(evaluateNode(node.right, run), `Right side of ${operator}`);
  }
  const left = evaluateNode(node.left, run);
  const right = evaluateNode(node.right, run);
  if (operator === "+" || operator === "-" || operator === "*" || operator === "/") {
    return arithmetic(operator, left, right);
  }
  return compare(operator, left, right);
}

function call(node: Extract<FormulaNode, { kind: "call" }>, run: Run): FormulaValue {
  if (node.name === "IF") {
    const [test, whenTrue, whenFalse] = node.args;
    if (!test || !whenTrue || !whenFalse || node.args.length !== 3) {
      throw new FormulaError(`IF expects 3 arguments, got ${node.args.length}`);
    }
    return evaluateNode(asBoolean(evaluateNode(test, run), "IF condition") ? whenTrue : whenFalse, run);
  }
  return implementations[node.name](
    node.args.map((arg) => evaluateNode(arg, run)),
    run.env,
  );
}

function evaluateNode(node: FormulaNode, run: Run): FormulaValue {
  if (Date.now() > run.deadline) throw new FormulaError(`Formula evaluation exceeded ${TIME_LIMIT_MS} ms`);
  switch (node.kind) {
    case "number":
    case "text":
    case "boolean":
      return node.value;
    case "variable": {
      const value = run.variables[node.name];
      if (value === undefined) throw new FormulaError(`Variable ${node.name} has no value`);
      return value;
    }
    case "unary": {
      const value = evaluateNode(node.argument, run);
      return node.operator === "NOT" ? !asBoolean(value, "NOT") : asNumber(value, "Negation").neg();
    }
    case "binary":
      return binary(node, run);
    case "call":
      return call(node, run);
  }
}

/** Mengevaluasi rumus FM-02 dengan decimal.js; error apa pun dilempar sebagai `FormulaError` (FM-09). */
export function evaluateFormula(expression: string, context: EvaluationContext): FormulaValue {
  const run: Run = {
    variables: context.variables,
    env: {
      endOfMonth: context.endOfMonth ?? "LAST_DAY",
      holidays: context.holidays ?? [],
      lookups: context.lookups ?? {},
    },
    deadline: Date.now() + TIME_LIMIT_MS,
  };
  try {
    return evaluateNode(parseFormula(expression), run);
  } catch (error) {
    if (error instanceof FormulaError) throw error;
    // Error decimal.js (contoh pangkat tak hingga) diterjemahkan agar pemanggil hanya menangani FormulaError.
    throw new FormulaError(error instanceof Error ? error.message : String(error));
  }
}
