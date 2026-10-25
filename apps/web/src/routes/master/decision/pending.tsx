import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { DECISION_MATRIX_PRESENTATION } from "../../../features/decision-matrix/labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/decision/pending")({
  component: () => (
    <MenuGuard menuCode="MST-DECISION">
      <PendingList
        title="Pending Decision Matrix"
        entityTypes={["DECISION_MATRIX"]}
        presentation={DECISION_MATRIX_PRESENTATION}
      />
    </MenuGuard>
  ),
});
