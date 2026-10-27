import { createFileRoute } from "@tanstack/react-router";
import { APPROVAL_HIERARCHY_PRESENTATION } from "../../../features/approval-hierarchy/labels";
import { PendingList } from "../../../features/change-request/PendingList";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/approvals/pending")({
  component: () => (
    <MenuGuard menuCode="MST-APPROVAL">
      <PendingList
        title="Pending Approval Setup"
        entityTypes={["APPROVAL_HIERARCHY"]}
        presentation={APPROVAL_HIERARCHY_PRESENTATION}
      />
    </MenuGuard>
  ),
});
