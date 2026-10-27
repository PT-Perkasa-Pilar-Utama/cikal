import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useScoringModel } from "../../../features/scoring-model/api";
import { ScoringModelDetail } from "../../../features/scoring-model/ScoringModelDetail";
import { useMenuActions } from "../../../features/session/api";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Detail satu versi model scoring atau RAC dengan kriterianya (api-specs 22 §22.2). */
function ScoringModelPage() {
  const { modelId } = Route.useParams();
  const navigate = useNavigate();
  const actions = useMenuActions("MST-SCORING");
  const { data, isPending, error } = useScoringModel(modelId);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">Scoring Model</h1>
      {isPending && <p>Loading...</p>}
      {error && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {data && (
        <ScoringModelDetail
          key={data.data.id}
          model={data.data}
          canUpdate={actions.has("UPDATE")}
          onNewVersion={(draftId) => void navigate({ to: "/master/scoring/$modelId", params: { modelId: draftId } })}
        />
      )}
    </section>
  );
}

export const Route = createFileRoute("/master/scoring/$modelId")({
  component: () => (
    <MenuGuard menuCode="MST-SCORING">
      <ScoringModelPage />
    </MenuGuard>
  ),
});
