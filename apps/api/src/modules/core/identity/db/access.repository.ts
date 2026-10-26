import { Injectable } from "@nestjs/common";
import { and, eq, exists, gte, lte, or, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { AccessFlags, MenuAccessFacts } from "../domain/access-policy.js";
import { menus, roleAccess, roles, userAccess, users } from "./schema.js";

const flagColumns = (table: typeof roleAccess | typeof userAccess) => ({
  canView: table.canView,
  canCreate: table.canCreate,
  canUpdate: table.canUpdate,
  canDelete: table.canDelete,
  canApprove: table.canApprove,
});

export interface MenuRef {
  id: string;
  moduleCode: string;
  isActive: boolean;
}

/** Hak menu user dari RoleAccess dan UserAccess (technical-specs 09 §9.4). */
@Injectable()
export class AccessRepository {
  async findMenu(tx: Tx, menuCode: string): Promise<MenuRef | null> {
    const [menu] = await tx
      .select({ id: menus.id, moduleCode: menus.moduleCode, isActive: menus.isActive })
      .from(menus)
      .where(eq(menus.menuCode, menuCode));
    return menu ?? null;
  }

  async findMenuAccess(
    tx: Tx,
    userId: string,
    menuCode: string,
    today: string,
  ): Promise<Pick<MenuAccessFacts, "menu" | "grants">> {
    const menu = await this.findMenu(tx, menuCode);
    if (!menu) return { menu: null, grants: [] };

    const byRole: AccessFlags[] = await tx
      .select(flagColumns(roleAccess))
      .from(roleAccess)
      .innerJoin(roles, and(eq(roles.id, roleAccess.roleId), eq(roles.isActive, true)))
      .innerJoin(users, eq(users.roleId, roles.id))
      .where(and(eq(users.id, userId), eq(roleAccess.menuId, menu.id)));
    const byUser: AccessFlags[] = await tx
      .select(flagColumns(userAccess))
      .from(userAccess)
      .where(
        and(
          eq(userAccess.userId, userId),
          eq(userAccess.menuId, menu.id),
          lte(userAccess.validFrom, today),
          gte(userAccess.validTo, today),
        ),
      );
    return { menu, grants: [...byRole, ...byUser] };
  }
}

/**
 * Kondisi baris `iam.users` yang punya hak `flag` pada `menuId` hari ini lewat role aktifnya atau UserAccess, untuk
 * query daftar user (api-specs 03 §3.6). Aturan sama dengan `decideAccess`: View wajib ada bersama hak lainnya.
 */
export function grantsAccess(tx: Tx, menuId: string, flag: keyof AccessFlags, today: string): SQL | undefined {
  const granted = (column: keyof AccessFlags) =>
    or(
      exists(
        tx
          .select({ one: sql`1` })
          .from(roleAccess)
          .innerJoin(roles, and(eq(roles.id, roleAccess.roleId), eq(roles.isActive, true)))
          .where(and(eq(roleAccess.roleId, users.roleId), eq(roleAccess.menuId, menuId), eq(roleAccess[column], true))),
      ),
      exists(
        tx
          .select({ one: sql`1` })
          .from(userAccess)
          .where(
            and(
              eq(userAccess.userId, users.id),
              eq(userAccess.menuId, menuId),
              lte(userAccess.validFrom, today),
              gte(userAccess.validTo, today),
              eq(userAccess[column], true),
            ),
          ),
      ),
    );
  return and(granted("canView"), granted(flag));
}
