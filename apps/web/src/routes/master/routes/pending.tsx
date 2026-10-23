import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { ROUTE_PRESENTATION } from "../../../features/product/route-labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/routes/pending")({
  component: () => (
    <MenuGuard menuCode="MST-ROUTE">
      <PendingList title="Pending Product Route" entityTypes={["ROUTE"]} presentation={ROUTE_PRESENTATION} />
    </MenuGuard>
  ),
});
