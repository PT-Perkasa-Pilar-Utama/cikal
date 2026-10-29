import type { DisbursementDetail } from "@cikal/contracts";
import type { ReactNode } from "react";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useDisbursement } from "./api";
import { DisbursementSummary } from "./DisbursementSummary";

interface StepWorkPageProps {
  title: string;
  applicationId: string;
  children: (detail: DisbursementDetail) => ReactNode;
}

/** Layar kerja satu tugas pencairan: "Disbursement Detail" lalu form langkahnya (api-specs 25 §25.1). */
export function StepWorkPage({ title, applicationId, children }: StepWorkPageProps) {
  const { data, isPending, error } = useDisbursement(applicationId);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {isPending && <p>Loading...</p>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {data && (
        <>
          <DisbursementSummary detail={data.data} />
          {children(data.data)}
        </>
      )}
    </section>
  );
}
