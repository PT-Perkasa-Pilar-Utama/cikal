import {
  ANY_OUTCOME,
  type DecisionSimulation,
  decisionOutcomeSchema,
  MATRIX_COLUMN_LABELS,
  MATRIX_COLUMNS,
  MATRIX_VALUE_LABELS,
  type MatrixColumn,
  moduleOutcomeValues,
} from "@cikal/contracts";
import type { SelectOption } from "../../components/ui/SelectField";
import type { FieldPresentation } from "../change-request/comparison";

/** Label nilai matrix (api-specs 24 §24.1); nilai tanpa label tampil apa adanya. */
export const valueLabel = (value: string): string => MATRIX_VALUE_LABELS[value] ?? value;

const toOptions = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: valueLabel(value) }));

/** Pilihan kolom di form edit, termasuk `[ANY]` (AC-36.05). */
export const rowOptions = (column: MatrixColumn): SelectOption[] =>
  toOptions([...moduleOutcomeValues[column], ANY_OUTCOME]);

/** Pilihan kolom di simulasi; hasil modul satu pengajuan tidak pernah `[ANY]` (api-specs 24 §24.3). */
export const simulationOptions = (column: MatrixColumn): SelectOption[] => toOptions(moduleOutcomeValues[column]);

export const DECISION_OPTIONS: readonly SelectOption[] = toOptions(decisionOutcomeSchema.options);

/** Baris yang dipakai simulasi, contoh "Priority 4: Dedup UnMatch, ..., SLIK Collect 1" (AC-36.02). */
export function matchedRowText(row: NonNullable<DecisionSimulation["matchedRow"]>): string {
  const columns = MATRIX_COLUMNS.filter((column) => row[column] !== ANY_OUTCOME).map(
    (column) => `${MATRIX_COLUMN_LABELS[column]} ${valueLabel(row[column])}`,
  );
  return `Priority ${row.priority}: ${columns.join(", ")}`;
}

const columnValueLabels = Object.fromEntries(MATRIX_COLUMNS.map((column) => [column, MATRIX_VALUE_LABELS]));

/** "Pending Decision Matrix" memakai nama kolom dan nilai matrix yang sama dengan halaman Decision Matrix. */
export const DECISION_MATRIX_PRESENTATION: FieldPresentation = {
  labels: {
    priority: "Priority",
    ...MATRIX_COLUMN_LABELS,
    decisionOutcome: "Decision Outcome",
    description: "Description",
  },
  valueLabels: { ...columnValueLabels, decisionOutcome: MATRIX_VALUE_LABELS },
};
