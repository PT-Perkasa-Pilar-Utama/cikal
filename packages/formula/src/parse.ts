import { Decimal } from "decimal.js";
import jsep from "jsep";
import { FormulaError } from "./values.js";

/** Batas kedalaman pohon ekspresi (technical-specs 07 §7.5, FM-02). */
const MAX_DEPTH = 50;

/** Fungsi daftar putih FM-02 (technical-specs 05 §5.16). */
export const formulaFunctions = [
  "IF",
  "MIN",
  "MAX",
  "ABS",
  "ROUND",
  "ROUNDUP",
  "ROUNDDOWN",
  "PMT",
  "IPMT",
  "PPMT",
  "PV",
  "DATEDIFF",
  "ADDMONTHS",
  "EOMONTH",
  "WORKDAYS",
  "LOOKUP",
] as const;
export type FormulaFunction = (typeof formulaFunctions)[number];

const binaryOperators = ["+", "-", "*", "/", "==", "!=", "<", ">", "<=", ">=", "AND", "OR"] as const;
export type BinaryOperator = (typeof binaryOperators)[number];
const unaryOperators = ["-", "NOT"] as const;
export type UnaryOperator = (typeof unaryOperators)[number];

export type FormulaNode =
  | { kind: "number"; value: Decimal }
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "variable"; name: string }
  | { kind: "unary"; operator: UnaryOperator; argument: FormulaNode }
  | { kind: "binary"; operator: BinaryOperator; left: FormulaNode; right: FormulaNode }
  | { kind: "call"; name: FormulaFunction; args: FormulaNode[] };

jsep.addBinaryOp("OR", 1);
jsep.addBinaryOp("AND", 2);
jsep.addUnaryOp("NOT");

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  values.some((known) => known === value);

function isExpression(value: unknown): value is jsep.Expression {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function child(value: unknown): jsep.Expression {
  if (!isExpression(value)) throw new FormulaError("Formula contains an incomplete expression");
  return value;
}

function literal(node: jsep.Expression): FormulaNode {
  const { value, raw } = node;
  if (typeof value === "number" && typeof raw === "string") return { kind: "number", value: new Decimal(raw) };
  if (typeof value === "string") return { kind: "text", value };
  if (typeof value === "boolean") return { kind: "boolean", value };
  throw new FormulaError(`Literal ${String(raw)} is not allowed`);
}

/** Mengubah AST jsep menjadi AST daftar putih; node, operator, dan fungsi lain ditolak (FM-02). */
function convert(node: jsep.Expression, depth: number): FormulaNode {
  if (depth > MAX_DEPTH) throw new FormulaError(`Formula is nested deeper than ${MAX_DEPTH} levels`);
  const next = (value: unknown) => convert(child(value), depth + 1);
  switch (node.type) {
    case "Literal":
      return literal(node);
    case "Identifier":
      if (typeof node.name !== "string") break;
      return { kind: "variable", name: node.name };
    case "UnaryExpression":
      if (!isOneOf(unaryOperators, node.operator)) break;
      return { kind: "unary", operator: node.operator, argument: next(node.argument) };
    case "BinaryExpression":
      if (!isOneOf(binaryOperators, node.operator)) break;
      return { kind: "binary", operator: node.operator, left: next(node.left), right: next(node.right) };
    case "CallExpression": {
      const callee = child(node.callee);
      const args = node.arguments;
      if (callee.type !== "Identifier" || !isOneOf(formulaFunctions, callee.name) || !Array.isArray(args)) {
        throw new FormulaError(`Function ${String(callee.name ?? callee.type)} is not allowed`);
      }
      return { kind: "call", name: callee.name, args: args.map(next) };
    }
  }
  const operator = typeof node.operator === "string" ? ` ${node.operator}` : "";
  throw new FormulaError(`Expression ${node.type}${operator} is not allowed`);
}

/** Parse rumus dengan jsep lalu periksa daftar putih node dan fungsi (FM-02); tanpa `eval`. */
export function parseFormula(expression: string): FormulaNode {
  let tree: jsep.Expression;
  try {
    tree = jsep(expression);
  } catch (error) {
    throw new FormulaError(error instanceof Error ? error.message : String(error));
  }
  return convert(tree, 1);
}

/** Nama variabel yang dirujuk rumus, untuk memeriksa katalog dan referensi antar rumus (FM-03). */
export function referencedVariables(node: FormulaNode): Set<string> {
  switch (node.kind) {
    case "variable":
      return new Set([node.name]);
    case "unary":
      return referencedVariables(node.argument);
    case "binary":
      return new Set([...referencedVariables(node.left), ...referencedVariables(node.right)]);
    case "call":
      return new Set(node.args.flatMap((arg) => [...referencedVariables(arg)]));
    default:
      return new Set();
  }
}
