import { createFileRoute } from "@tanstack/react-router";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "Role Access" dibangun di kartu FE-S1-04 (api-specs 03 §3.3 s.d. §3.5). */
export const Route = createFileRoute("/access/role-access/")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <h1 className="text-2xl font-bold text-primary">Role Access</h1>
    </MenuGuard>
  ),
});
