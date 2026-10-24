import { createFileRoute } from "@tanstack/react-router";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useInstallmentSimulation } from "../../features/installment-simulation/api";
import { ScheduleTable } from "../../features/installment-simulation/ScheduleTable";
import { type FieldErrors, SimulationForm } from "../../features/installment-simulation/SimulationForm";
import { MenuGuard } from "../../features/session/MenuGuard";
import { ApiError } from "../../lib/api/client";

const FORM_FIELDS = new Set(["principal", "tenor", "interestRate", "interestType"]);

/** Pesan per field dari envelope `VALIDATION_FAILED`; error lain tampil sebagai Feedback Message. */
function fieldErrors(error: Error | null): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(
    error.envelope.details.filter((detail) => FORM_FIELDS.has(detail.field)).map((d) => [d.field, d.message]),
  );
}

/** Halaman "Installment Simulation" Sales (api-specs 09 §9.1, US-51). */
function SimulationPage() {
  const simulate = useInstallmentSimulation();
  const serverErrors = fieldErrors(simulate.error);
  const formError = simulate.error && Object.keys(serverErrors).length === 0 ? simulate.error.message : undefined;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Installment Simulation</h1>
      <div className="flex flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-s">
        {formError && <FeedbackMessage type="error">{formError}</FeedbackMessage>}
        <SimulationForm
          onCalculate={(request) => simulate.mutate(request)}
          calculating={simulate.isPending}
          serverErrors={serverErrors}
        />
      </div>
      {simulate.data && (
        <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
          <ScheduleTable simulation={simulate.data} />
        </div>
      )}
    </section>
  );
}

export const Route = createFileRoute("/applications/simulation")({
  component: () => (
    <MenuGuard menuCode="APP-SIMULATION">
      <SimulationPage />
    </MenuGuard>
  ),
});
