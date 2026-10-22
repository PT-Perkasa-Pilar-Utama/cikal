import type { RoleAccessCreateRequest } from "@cikal/contracts";
import type { FieldPresentation } from "../change-request/comparison";

export type AccessFlag = keyof Pick<
  RoleAccessCreateRequest,
  "canView" | "canCreate" | "canUpdate" | "canDelete" | "canApprove"
>;

/** Lima toggle aksi berurutan seperti matriks V, C, U, D, A (AC-09.01; technical-specs 09 §9.5). */
export const ACCESS_FLAGS: readonly { flag: AccessFlag; label: string }[] = [
  { flag: "canView", label: "View" },
  { flag: "canCreate", label: "Create" },
  { flag: "canUpdate", label: "Update" },
  { flag: "canDelete", label: "Delete" },
  { flag: "canApprove", label: "Approve" },
];

/** "Pending Role Access" menampilkan nama role dan menu; id role dan menu tidak berarti bagi Checker. */
export const ROLE_ACCESS_PRESENTATION: FieldPresentation = {
  labels: {
    roleName: "Role",
    menuName: "Menu",
    menuCode: "Menu Code",
    ...Object.fromEntries(ACCESS_FLAGS.map(({ flag, label }) => [flag, label])),
  },
  hidden: ["roleId", "menuId"],
};
