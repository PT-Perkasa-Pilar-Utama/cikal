import {
  type DecisionMatrixRow,
  decisionMatrixRowInputSchema,
  MATRIX_COLUMN_LABELS,
  MATRIX_COLUMNS,
  type MatrixColumn,
  standardErrors,
} from "@cikal/contracts";
import { Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { useUpdateMatrixRow } from "./api";
import { DECISION_OPTIONS, rowOptions } from "./labels";

interface MatrixRowFormProps {
  row: DecisionMatrixRow;
  onClose: () => void;
  /** Dipanggil dengan `message` server, contoh "Data submitted for approval" (AC-36.01). */
  onSaved: (message: string | undefined) => void;
}

type ColumnValues = Record<MatrixColumn, string>;

const columnValues = (row: DecisionMatrixRow): ColumnValues => ({
  dedupOutcome: row.dedupOutcome,
  dukcapilOutcome: row.dukcapilOutcome,
  fraudOutcome: row.fraudOutcome,
  racOutcome: row.racOutcome,
  scoringOutcome: row.scoringOutcome,
  creditBureauOutcome: row.creditBureauOutcome,
});

/**
 * Popup edit satu baris Decision Matrix: enam hasil modul dengan `[ANY]`, "Decision Outcome", prioritas, dan
 * deskripsi. "Save" mengajukan perubahan ke Checker (api-specs 24 §24.2, AC-36.01).
 */
export function MatrixRowForm({ row, onClose, onSaved }: MatrixRowFormProps) {
  const update = useUpdateMatrixRow(row.id);
  const [columns, setColumns] = useState<ColumnValues>(() => columnValues(row));
  const [decisionOutcome, setDecisionOutcome] = useState<string>(row.decisionOutcome);
  const [priority, setPriority] = useState(String(row.priority));
  const [description, setDescription] = useState(row.description ?? "");
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = decisionMatrixRowInputSchema.safeParse({
      ...columns,
      decisionOutcome,
      priority: Number(priority),
      description: description.trim() || null,
    });
    setInvalid(!parsed.success);
    if (parsed.success) update.mutate(parsed.data, { onSuccess: (result) => onSaved(result.message) });
  }

  const message = invalid ? standardErrors.VALIDATION_FAILED.message : update.error?.message;

  return (
    <Popup title="Edit Decision Matrix" onClose={onClose}>
      <form aria-label="Decision Matrix" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
        <div className="grid gap-4 md:grid-cols-3">
          {MATRIX_COLUMNS.map((column) => (
            <SelectField
              key={column}
              label={MATRIX_COLUMN_LABELS[column]}
              required
              options={rowOptions(column)}
              value={columns[column]}
              onChange={(event) => setColumns((current) => ({ ...current, [column]: event.target.value }))}
            />
          ))}
          <SelectField
            label="Decision Outcome"
            required
            options={DECISION_OPTIONS}
            value={decisionOutcome}
            onChange={(event) => setDecisionOutcome(event.target.value)}
          />
          <TextField
            label="Priority"
            required
            type="number"
            min={1}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          />
          <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            <Save size={20} aria-hidden />
            Save
          </Button>
        </div>
      </form>
    </Popup>
  );
}
