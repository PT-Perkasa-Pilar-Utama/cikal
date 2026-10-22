import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { ROLE_ACCESS_PRESENTATION } from "../../../features/role-access/labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/access/role-access/pending")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <PendingList title="Pending Role Access" entityTypes={["ROLE_ACCESS"]} presentation={ROLE_ACCESS_PRESENTATION} />
    </MenuGuard>
  ),
});
