import {
  type DecisionSimulation,
  decisionSimulationRequestSchema,
  MATRIX_COLUMN_LABELS,
  MATRIX_COLUMNS,
  type MatrixColumn,
} from "@cikal/contracts";
import { Play } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Popup } from "../../components/ui/Popup";
import { SelectField } from "../../components/ui/SelectField";
import { useSimulateDecision } from "./api";
import { matchedRowText, simulationOptions, valueLabel } from "./labels";

/** Matrix aktif, atau matrix aktif ditambah semua pengajuan yang menunggu persetujuan (api-specs 24 §24.3). */
const MATRIX_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
] as const;

function SimulationResult({ result }: { result: DecisionSimulation }) {
  return (
    <section aria-label="Simulation Result" className="flex flex-col gap-2 rounded-lg bg-neutral-1 p-4">
      <p className="text-lg font-bold text-neutral-8">{valueLabel(result.decisionOutcome)}</p>
      {result.matchedRow && <p>{matchedRowText(result.matchedRow)}</p>}
      {result.note && <p>{result.note}</p>}
    </section>
  );
}

/**
 * Dialog "Decision Matrix Simulation": pilih hasil enam modul lalu "Run" untuk melihat keputusan dan baris yang dipakai
 * (AC-36.02, AC-36.03). Modul yang belum dipilih tidak dikirim, sehingga server menjawab "Select an outcome for every
 * module" (AC-36.04).
 */
export function SimulationPopup({ onClose }: { onClose: () => void }) {
  const simulate = useSimulateDecision();
  const [outcomes, setOutcomes] = useState<Partial<Record<MatrixColumn, string>>>({});
  const [useMatrix, setUseMatrix] = useState<string>("ACTIVE");

  function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = Object.fromEntries(Object.entries(outcomes).filter(([, value]) => value !== ""));
    const parsed = decisionSimulationRequestSchema.safeParse({ ...chosen, useMatrix });
    if (parsed.success) simulate.mutate(parsed.data);
  }

  return (
    <Popup title="Decision Matrix Simulation" onClose={onClose}>
      <form aria-label="Simulate" noValidate onSubmit={handleRun} className="flex flex-col gap-4">
        {simulate.error && <FeedbackMessage type="error">{simulate.error.message}</FeedbackMessage>}
        <div className="grid gap-4 md:grid-cols-3">
          {MATRIX_COLUMNS.map((column) => (
            <SelectField
              key={column}
              label={MATRIX_COLUMN_LABELS[column]}
              required
              options={simulationOptions(column)}
              value={outcomes[column] ?? ""}
              onChange={(event) => setOutcomes((current) => ({ ...current, [column]: event.target.value }))}
            />
          ))}
          <SelectField
            label="Matrix"
            options={MATRIX_OPTIONS}
            value={useMatrix}
            onChange={(event) => setUseMatrix(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={simulate.isPending}>
            <Play size={20} aria-hidden />
            Run
          </Button>
        </div>
      </form>
      {simulate.data && <SimulationResult result={simulate.data.data} />}
    </Popup>
  );
}
