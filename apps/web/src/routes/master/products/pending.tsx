import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/products/pending")({
  component: () => (
    <MenuGuard menuCode="MST-PRODUCT">
      <PendingList title="Pending Product" entityTypes={["PRODUCT", "PRODUCT_PRICING"]} />
    </MenuGuard>
  ),
});
