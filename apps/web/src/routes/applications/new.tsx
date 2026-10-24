import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NewApplication } from "../../features/application-entry/NewApplication";
import { MenuGuard } from "../../features/session/MenuGuard";

/**
 * Halaman "New Application"; "Back" dari step pertama membuka "Application List" (AC-39.04), dan submit berhasil
 * membukanya dengan pesan "Application submitted. Loan ID: ..." (AC-50.01).
 */
function NewApplicationPage() {
  const navigate = useNavigate();
  return (
    <NewApplication
      onExit={() => void navigate({ to: "/applications/drafts" })}
      onSubmitted={(notice) => void navigate({ to: "/applications/drafts", state: { notice } })}
    />
  );
}

export const Route = createFileRoute("/applications/new")({
  component: () => (
    <MenuGuard menuCode="APP-ENTRY">
      <NewApplicationPage />
    </MenuGuard>
  ),
});
