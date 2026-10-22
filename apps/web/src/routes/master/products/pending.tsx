import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";

export const Route = createFileRoute("/master/products/pending")({
  component: () => <PendingList title="Pending Product" entityTypes={["PRODUCT", "PRODUCT_PRICING"]} />,
});
