import {
  ANY_OUTCOME,
  DECISION_MATRIX_MESSAGES,
  type DecisionOutcome,
  MATRIX_COLUMNS,
  type MatrixCombination,
  type ModuleOutcomes,
} from "@cikal/contracts";

/** Satu baris Decision Matrix (technical-specs 06 §6.11 M11). */
export type MatrixRule = MatrixCombination & {
  id: string;
  priority: number;
  decisionOutcome: DecisionOutcome;
  description: string | null;
};

export interface Decision {
  decisionOutcome: DecisionOutcome;
  matchedRow: MatrixRule | null;
  note: string | null;
}

const byPriority = (a: MatrixRule, b: MatrixRule): number => a.priority - b.priority;

export function sameCombination(a: MatrixCombination, b: MatrixCombination): boolean {
  return MATRIX_COLUMNS.every((column) => a[column] === b[column]);
}

function matches(rule: MatrixRule, outcomes: ModuleOutcomes): boolean {
  return MATRIX_COLUMNS.every((column) => rule[column] === ANY_OUTCOME || rule[column] === outcomes[column]);
}

/**
 * Lookup Decision Matrix (api-specs 24 §24.3): baris pertama menurut `priority` yang cocok, `ANY` cocok untuk semua
 * hasil (AC-36.05). Tanpa baris cocok keputusannya NotGo default dengan keterangan (AC-36.03).
 */
export function decide(rules: readonly MatrixRule[], outcomes: ModuleOutcomes): Decision {
  const matched = [...rules].sort(byPriority).find((rule) => matches(rule, outcomes));
  if (!matched) return { decisionOutcome: "NOTGO", matchedRow: null, note: DECISION_MATRIX_MESSAGES.noMatchingRule };
  return { decisionOutcome: matched.decisionOutcome, matchedRow: matched, note: null };
}

/**
 * Menempatkan `rule` di prioritasnya. Bila baris lain sudah memakai prioritas itu, baris dengan prioritas sama atau
 * lebih besar digeser satu (api-specs 24 §24.2), sehingga urutan baris lain tetap.
 */
export function place(rules: readonly MatrixRule[], rule: MatrixRule): MatrixRule[] {
  const others = rules.filter((other) => other.id !== rule.id);
  const taken = others.some((other) => other.priority === rule.priority);
  const shifted = taken
    ? others.map((other) => (other.priority >= rule.priority ? { ...other, priority: other.priority + 1 } : other))
    : others;
  return [...shifted, rule].sort(byPriority);
}
