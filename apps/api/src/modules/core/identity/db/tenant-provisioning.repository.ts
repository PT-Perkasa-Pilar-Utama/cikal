import type { MenuCode } from "@cikal/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { rightFlags, roleRights, STANDARD_ROLES, type StandardRoleKey } from "../domain/standard-roles.js";
import { seedMenuId } from "../seed/menus.js";
import { roleAccess, roles, users } from "./schema.js";

/** Pembentuk ID role dan baris RoleAccess: ID tetap untuk seed, UUID v7 untuk company baru. */
export interface RoleIds {
  role(key: StandardRoleKey): string;
  access(roleId: string, menuCode: MenuCode): string;
}

export interface NewAdministrator {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
  roleId: string;
}

/**
 * Penulisan provisioning tenant oleh role pemilik skema di luar sesi (seed dan `create-admin`, DEPLOYMENT_PLAN §3.6).
 * Role pemilik skema melewati RLS, jadi setiap baris menyebut tenant-nya sendiri.
 */
export const tenantProvisioning = {
  /** Role standar technical-specs 09 §9.5 beserta haknya; menu memakai ID tetap seed `base`. */
  async insertStandardRoles(db: NodePgDatabase, tenantId: string, ids: RoleIds): Promise<void> {
    const keys = Object.keys(STANDARD_ROLES).filter((key): key is StandardRoleKey => key in STANDARD_ROLES);
    await db
      .insert(roles)
      .values(keys.map((key) => ({ id: ids.role(key), tenantId, roleName: STANDARD_ROLES[key].name })))
      .onConflictDoNothing();
    const rows = keys.flatMap((key) =>
      roleRights(key).map(([code, rights]) => ({
        id: ids.access(ids.role(key), code),
        tenantId,
        roleId: ids.role(key),
        menuId: seedMenuId(code),
        ...rightFlags(rights),
      })),
    );
    await db.insert(roleAccess).values(rows).onConflictDoNothing();
  },

  async roleId(db: NodePgDatabase, tenantId: string, roleName: string): Promise<string | null> {
    const [row] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.roleName, roleName)));
    return row?.id ?? null;
  },

  async usernameTaken(db: NodePgDatabase, username: string): Promise<boolean> {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);
    return row !== undefined;
  },

  /** Admin pertama wajib mengganti password sekali pakai saat login pertama (DEPLOYMENT_PLAN §3.6). */
  async insertAdministrator(db: NodePgDatabase, admin: NewAdministrator): Promise<void> {
    await db.insert(users).values({ ...admin, mustChangePassword: true, status: "ACTIVE", createdBy: null });
  },
};
