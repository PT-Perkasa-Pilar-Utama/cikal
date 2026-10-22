import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { AccessFlags } from "../domain/access-policy.js";
import { menus, roleAccess, roles } from "./schema.js";

export interface RoleAccessFilter {
  roleId?: string;
  menuId?: string;
}

export interface RoleAccessPage {
  offset: number;
  limit: number;
  sort: "roleName" | "menuName";
  direction: "asc" | "desc";
}

export interface RoleAccessRow extends AccessFlags {
  id: string;
  role: { id: string; roleName: string };
  menu: { id: string; menuCode: string; menuName: string; parentMenuName: string | null };
}

const parentMenus = alias(menus, "parent_menus");

const rowColumns = {
  id: roleAccess.id,
  role: { id: roles.id, roleName: roles.roleName },
  menu: { id: menus.id, menuCode: menus.menuCode, menuName: menus.menuName, parentMenuName: parentMenus.menuName },
  canView: roleAccess.canView,
  canCreate: roleAccess.canCreate,
  canUpdate: roleAccess.canUpdate,
  canDelete: roleAccess.canDelete,
  canApprove: roleAccess.canApprove,
};

/** Akses tabel `iam.role_access` untuk halaman "Role Access" (technical-specs 06 §6.4). */
@Injectable()
export class RoleAccessRepository {
  async list(tx: Tx, filter: RoleAccessFilter, page: RoleAccessPage): Promise<RoleAccessRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    const column = page.sort === "roleName" ? roles.roleName : menus.menuName;
    return this.joined(tx)
      .where(this.matching(filter))
      .orderBy(order(column), asc(roleAccess.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: RoleAccessFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(roleAccess).where(this.matching(filter));
    return row?.total ?? 0;
  }

  async findById(tx: Tx, id: string): Promise<RoleAccessRow | null> {
    const [row] = await this.joined(tx).where(eq(roleAccess.id, id));
    return row ?? null;
  }

  async exists(tx: Tx, roleId: string, menuId: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: roleAccess.id })
      .from(roleAccess)
      .where(and(eq(roleAccess.roleId, roleId), eq(roleAccess.menuId, menuId)));
    return row !== undefined;
  }

  async insert(
    tx: Tx,
    row: AccessFlags & { id: string; tenantId: string; roleId: string; menuId: string; userId: string },
  ): Promise<void> {
    const { userId, ...values } = row;
    await tx.insert(roleAccess).values({ ...values, createdBy: userId, updatedBy: userId });
  }

  async updateFlags(tx: Tx, id: string, flags: AccessFlags, userId: string): Promise<void> {
    await tx
      .update(roleAccess)
      .set({ ...flags, updatedAt: new Date(), updatedBy: userId })
      .where(eq(roleAccess.id, id));
  }

  private joined(tx: Tx) {
    return tx
      .select(rowColumns)
      .from(roleAccess)
      .innerJoin(roles, eq(roles.id, roleAccess.roleId))
      .innerJoin(menus, eq(menus.id, roleAccess.menuId))
      .leftJoin(parentMenus, eq(parentMenus.id, menus.parentMenuId))
      .$dynamic();
  }

  private matching(filter: RoleAccessFilter): SQL | undefined {
    return and(
      filter.roleId ? eq(roleAccess.roleId, filter.roleId) : undefined,
      filter.menuId ? eq(roleAccess.menuId, filter.menuId) : undefined,
    );
  }
}
