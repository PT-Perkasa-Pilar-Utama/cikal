import type { Action } from "@cikal/contracts";

export interface AccessFlags {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface MenuAccessFacts {
  /** `null` bila kode menu tidak ada. */
  menu: { moduleCode: string; isActive: boolean } | null;
  /** RoleAccess role user dan UserAccess yang berlaku hari ini. */
  grants: AccessFlags[];
  /** Modul lisensi aktif yang ada di paket (PK-04). */
  licensedModules: ReadonlySet<string>;
  /** Rute halaman License tidak memeriksa lisensi modul menunya (api-specs 04 §4.2). */
  licenseExempt: boolean;
}

export type AccessDecision = "ALLOW" | "ACCESS_DENIED" | "ACTION_DENIED" | "MODULE_NOT_LICENSED";

/** Kolom hak tiap aksi menu. */
export const ACCESS_FLAG_OF: Record<Action, keyof AccessFlags> = {
  VIEW: "canView",
  CREATE: "canCreate",
  UPDATE: "canUpdate",
  DELETE: "canDelete",
  APPROVE: "canApprove",
};

/**
 * Hak efektif = gabungan semua grant (technical-specs 09 §9.4). Aksi selain View butuh View juga (AC-09.03).
 * Tanpa hak, permintaan halaman (View) dijawab ACCESS_DENIED dan aksi lain ACTION_DENIED (AC-09.02, AC-09.04).
 */
export function decideAccess(facts: MenuAccessFacts, action: Action): AccessDecision {
  const denied = action === "VIEW" ? "ACCESS_DENIED" : "ACTION_DENIED";
  if (!facts.menu?.isActive) return denied;
  if (!facts.licenseExempt && !facts.licensedModules.has(facts.menu.moduleCode)) return "MODULE_NOT_LICENSED";
  const has = (flag: keyof AccessFlags) => facts.grants.some((grant) => grant[flag]);
  return has("canView") && has(ACCESS_FLAG_OF[action]) ? "ALLOW" : denied;
}
