import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/access/role-access/pending")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <PendingList title="Pending Role Access" entityTypes={["ROLE_ACCESS"]} />
    </MenuGuard>
  ),
});
