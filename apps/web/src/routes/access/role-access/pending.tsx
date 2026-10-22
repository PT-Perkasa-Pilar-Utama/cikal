import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";

export const Route = createFileRoute("/access/role-access/pending")({
  component: () => <PendingList title="Pending Role Access" entityTypes={["ROLE_ACCESS"]} />,
});
