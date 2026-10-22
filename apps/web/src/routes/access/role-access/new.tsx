import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FeedbackMessage } from "../../../components/ui/FeedbackMessage";
import { useCreateRoleAccess, useMenuTree, useRoleOptions } from "../../../features/role-access/api";
import { RoleAccessForm } from "../../../features/role-access/RoleAccessForm";
import { MenuGuard } from "../../../features/session/MenuGuard";

/** Halaman "New Role Access": berhasil membuka "Role Access" dengan pesan "Data submitted for approval" (AC-09.01). */
function NewRoleAccessPage() {
  const roles = useRoleOptions();
  const menus = useMenuTree();
  const create = useCreateRoleAccess();
  const navigate = useNavigate();
  const loadError = roles.error ?? menus.error;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">New Role Access</h1>
      <div className="rounded-lg bg-neutral-0 p-6 shadow-s">
        {loadError && <FeedbackMessage type="error">{loadError.message}</FeedbackMessage>}
        {(roles.isPending || menus.isPending) && !loadError && <p>Loading...</p>}
        {roles.data && menus.data && (
          <RoleAccessForm
            roles={roles.data}
            menus={menus.data}
            onSubmit={(request) =>
              create.mutate(request, {
                onSuccess: (result) => navigate({ to: "/access/role-access", state: { notice: result.message } }),
              })
            }
            submitting={create.isPending}
            error={create.error?.message}
          />
        )}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/access/role-access/new")({
  component: () => (
    <MenuGuard menuCode="IAM-ROLE-ACCESS">
      <NewRoleAccessPage />
    </MenuGuard>
  ),
});
