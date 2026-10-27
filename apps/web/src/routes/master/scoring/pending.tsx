import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { SCORING_MODEL_PRESENTATION } from "../../../features/scoring-model/labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/scoring/pending")({
  component: () => (
    <MenuGuard menuCode="MST-SCORING">
      <PendingList
        title="Pending Scoring Model"
        entityTypes={["SCORING_MODEL"]}
        presentation={SCORING_MODEL_PRESENTATION}
      />
    </MenuGuard>
  ),
});
