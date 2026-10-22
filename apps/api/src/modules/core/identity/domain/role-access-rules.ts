import type { RoleAccessData } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { AccessFlags } from "./access-policy.js";

/** Label modul hak akses di "Audit Trail". */
export const ROLE_ACCESS_AUDIT_MODULE = "Role Access";

const FLAGS: readonly (keyof AccessFlags)[] = ["canView", "canCreate", "canUpdate", "canDelete", "canApprove"];

/** Kode error Role Access dan pesannya (api-specs 03 §3.4, §3.5). */
const ROLE_ACCESS_ERRORS = {
  VIEW_ACCESS_REQUIRED: { status: 422, message: "View access is required when other access is granted" },
  // Teks usulan engineering (api-specs 03 §3.4), belum ada di AC.
  ROLE_ACCESS_EXISTS: { status: 409, message: "Access for this role and menu already exists" },
  NO_CHANGES: { status: 422, message: "No changes to submit" },
} as const;

export type RoleAccessErrorCode = keyof typeof ROLE_ACCESS_ERRORS;

export function roleAccessError(code: RoleAccessErrorCode): DomainError {
  return new DomainError(code, ROLE_ACCESS_ERRORS[code].message, ROLE_ACCESS_ERRORS[code].status);
}

/** View wajib bila aksi lain diberikan (AC-09.03); mencabut semua aksi tetap boleh (api-specs 03 §3.5). */
export function viewRequired(flags: AccessFlags): boolean {
  return !flags.canView && FLAGS.some((flag) => flags[flag]);
}

export function sameFlags(current: AccessFlags, proposed: AccessFlags): boolean {
  return FLAGS.every((flag) => current[flag] === proposed[flag]);
}

/** Nama baris di "Pending Role Access" (api-specs 07 §7.2), contoh `Checker - Product`. */
export function roleAccessDisplayName(data: Pick<RoleAccessData, "roleName" | "menuName">): string {
  return `${data.roleName} - ${data.menuName}`;
}
