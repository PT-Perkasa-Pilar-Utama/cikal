import { type MenuNode, type RoleAccessCreateRequest, standardErrors } from "@cikal/contracts";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { SelectField } from "../../components/ui/SelectField";
import { Switch } from "../../components/ui/Switch";
import { ACCESS_FLAGS, type AccessFlag } from "./labels";

interface RoleAccessFormProps {
  roles: readonly { id: string; roleName: string }[];
  menus: readonly MenuNode[];
  onSubmit: (request: RoleAccessCreateRequest) => void;
  submitting: boolean;
  /** Pesan error dari server, ditampilkan apa adanya, contoh AC-09.03. */
  error?: string;
}

const NO_ACCESS: Record<AccessFlag, boolean> = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canApprove: false,
};

/**
 * Form "New Role Access" (api-specs 03 §3.4). Hak diberikan ke sub menu, atau ke menu itu sendiri bila tidak punya
 * sub menu. Aturan View wajib diperiksa server dan pesannya tampil apa adanya (AC-09.03).
 */
export function RoleAccessForm({ roles, menus, onSubmit, submitting, error }: RoleAccessFormProps) {
  const [roleId, setRoleId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [subMenuId, setSubMenuId] = useState("");
  const [flags, setFlags] = useState(NO_ACCESS);
  const [invalid, setInvalid] = useState(false);
  const subMenus = menus.find((menu) => menu.id === menuId)?.children ?? [];
  const targetMenuId = subMenus.length > 0 ? subMenuId : menuId;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const complete = roleId !== "" && targetMenuId !== "";
    setInvalid(!complete);
    if (complete) onSubmit({ roleId, menuId: targetMenuId, ...flags });
  }

  const message = invalid ? standardErrors.VALIDATION_FAILED.message : error;

  return (
    <form aria-label="Role Access" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message && <FeedbackMessage type="error">{message}</FeedbackMessage>}
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Role"
          required
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          options={roles.map((role) => ({ value: role.id, label: role.roleName }))}
        />
        <SelectField
          label="Menu"
          required
          value={menuId}
          onChange={(event) => {
            setMenuId(event.target.value);
            setSubMenuId("");
          }}
          options={menus.map((menu) => ({ value: menu.id, label: menu.menuName }))}
        />
        <SelectField
          label="Sub Menu"
          required={subMenus.length > 0}
          disabled={subMenus.length === 0}
          value={subMenuId}
          onChange={(event) => setSubMenuId(event.target.value)}
          options={subMenus.map((menu) => ({ value: menu.id, label: menu.menuName }))}
        />
      </div>
      <fieldset className="flex flex-wrap gap-6">
        <legend className="mb-3 font-semibold text-neutral-7">Access</legend>
        {ACCESS_FLAGS.map(({ flag, label }) => (
          <Switch
            key={flag}
            label={label}
            checked={flags[flag]}
            onChange={(checked) => setFlags((current) => ({ ...current, [flag]: checked }))}
          />
        ))}
      </fieldset>
      <div className="flex justify-end gap-3">
        <Link
          to="/access/role-access"
          className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2.5 font-semibold text-primary hover:bg-primary-light/40"
        >
          <ArrowLeft size={20} aria-hidden />
          Back
        </Link>
        <Button type="submit" disabled={submitting}>
          <Send size={20} aria-hidden />
          Submit
        </Button>
      </div>
    </form>
  );
}
