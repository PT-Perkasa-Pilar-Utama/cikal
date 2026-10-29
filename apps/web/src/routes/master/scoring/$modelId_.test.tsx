import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useScoringModel } from "../../../features/scoring-model/api";
import { ModelTestPanel } from "../../../features/scoring-model/ModelTestPanel";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Scoring Model Test": uji satu versi model dengan pengajuan contoh (api-specs 22 §22.5, US-38). */
function ScoringModelTestPage() {
  const { modelId } = Route.useParams();
  const model = useScoringModel(modelId);
  return (
    <section className="flex flex-col gap-4">
      <Link
        to="/master/scoring/$modelId"
        params={{ modelId }}
        className="inline-flex items-center gap-1 self-start font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        Scoring Model
      </Link>
      <h1 className="text-2xl font-bold text-primary">Scoring Model Test</h1>
      {model.error && <FeedbackMessage type="error">{model.error.message}</FeedbackMessage>}
      {model.data && (
        <p className="text-neutral-7">
          <span className="font-semibold">{`${model.data.data.modelCode} v${model.data.data.versionNumber}`}</span>{" "}
          {model.data.data.modelName}
        </p>
      )}
      <ModelTestPanel modelId={modelId} />
    </section>
  );
}

export const Route = createFileRoute("/master/scoring/$modelId_/test")({
  component: () => (
    <MenuGuard menuCode="MST-SCORING">
      <ScoringModelTestPage />
    </MenuGuard>
  ),
});
