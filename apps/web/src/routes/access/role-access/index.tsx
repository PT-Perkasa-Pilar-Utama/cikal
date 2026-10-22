import { createFileRoute } from "@tanstack/react-router";

/** Halaman "Role Access" dibangun di kartu FE-S1-04 (api-specs 03 §3.3 s.d. §3.5). */
export const Route = createFileRoute("/access/role-access/")({
  component: () => <h1 className="text-2xl font-bold text-neutral-8">Role Access</h1>,
});
