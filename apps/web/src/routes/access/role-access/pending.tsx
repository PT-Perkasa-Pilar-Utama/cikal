import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Penamaan field Role Access mengikuti nama field; label khusus dipasang di kartu FE-S1-04. */
const ROLE_ACCESS_PRESENTATION = { labels: {} };

export const Route = createFileRoute("/access/role-access/pending")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <PendingList title="Pending Role Access" entityTypes={["ROLE_ACCESS"]} presentation={ROLE_ACCESS_PRESENTATION} />
    </MenuGuard>
  ),
});
