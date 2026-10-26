import type { UserListItem, UserStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { AccessFlags } from "../domain/access-policy.js";
import { grantsAccess } from "./access.repository.js";
import { roles, users } from "./schema.js";

export interface UserListFilter {
  q?: string;
  status: UserStatus;
  branchId?: string;
  /** Hanya user dengan hak ini pada menu `menuId` hari ini. */
  withAccess?: { menuId: string; flag: keyof AccessFlags; today: string };
}

export interface UserListPage {
  offset: number;
  limit: number;
  sort: "username" | "fullName";
  direction: "asc" | "desc";
}

/** Baris daftar user; kode cabang diisi dari modul Organization. */
export type UserListRow = Omit<UserListItem, "branchCode"> & { branchId: string | null };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Daftar `iam.users` untuk dropdown user (api-specs 03 §3.6). */
@Injectable()
export class UserListRepository {
  async list(tx: Tx, filter: UserListFilter, page: UserListPage): Promise<UserListRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        roleName: roles.roleName,
        branchId: users.branchId,
        status: users.status,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(this.matching(tx, filter))
      .orderBy(order(users[page.sort]), asc(users.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: UserListFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(users).where(this.matching(tx, filter));
    return row?.total ?? 0;
  }

  private matching(tx: Tx, filter: UserListFilter): SQL | undefined {
    const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
    const access = filter.withAccess;
    return and(
      eq(users.status, filter.status),
      filter.branchId ? eq(users.branchId, filter.branchId) : undefined,
      pattern ? or(ilike(users.username, pattern), ilike(users.fullName, pattern)) : undefined,
      access ? grantsAccess(tx, access.menuId, access.flag, access.today) : undefined,
    );
  }
}
