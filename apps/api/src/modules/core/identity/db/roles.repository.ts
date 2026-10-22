import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { roles } from "./schema.js";

export interface RoleRow {
  id: string;
  roleName: string;
  isActive: boolean;
}

export interface RoleFilter {
  isActive: boolean;
  q?: string;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Akses tabel `iam.roles` (technical-specs 06 §6.4). */
@Injectable()
export class RolesRepository {
  async list(
    tx: Tx,
    filter: RoleFilter,
    page: { offset: number; limit: number; direction: "asc" | "desc" },
  ): Promise<RoleRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select({ id: roles.id, roleName: roles.roleName, isActive: roles.isActive })
      .from(roles)
      .where(this.matching(filter))
      .orderBy(order(roles.roleName), asc(roles.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: RoleFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(roles).where(this.matching(filter));
    return row?.total ?? 0;
  }

  async findById(tx: Tx, id: string): Promise<RoleRow | null> {
    const [row] = await tx
      .select({ id: roles.id, roleName: roles.roleName, isActive: roles.isActive })
      .from(roles)
      .where(eq(roles.id, id));
    return row ?? null;
  }

  private matching(filter: RoleFilter): SQL | undefined {
    return and(
      eq(roles.isActive, filter.isActive),
      filter.q === undefined ? undefined : ilike(roles.roleName, `%${escapeLike(filter.q)}%`),
    );
  }
}
