import { Injectable } from "@nestjs/common";
import { eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { UserRef } from "../../../../platform/http/user-directory-port.js";
import { roles, users } from "./schema.js";

export interface UserAuthState {
  status: string;
  mustChangePassword: boolean;
}

export interface LoginUser {
  id: string;
  tenantId: string;
  passwordHash: string | null;
  status: string;
  roleId: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  roleName: string;
}

/** Akses tabel `iam.users` (technical-specs 06 §6.4). */
@Injectable()
export class UsersRepository {
  async findAuthState(tx: Tx, userId: string): Promise<UserAuthState | null> {
    const [row] = await tx
      .select({ status: users.status, mustChangePassword: users.mustChangePassword })
      .from(users)
      .where(eq(users.id, userId));
    return row ?? null;
  }

  /** Dipanggil di transaksi pra-tenant yang memasang `app.login_username` (DM-12); username huruf kecil. */
  async findForLogin(tx: Tx, username: string): Promise<LoginUser | null> {
    const [row] = await tx
      .select({
        id: users.id,
        tenantId: users.tenantId,
        passwordHash: users.passwordHash,
        status: users.status,
        roleId: users.roleId,
        failedLoginCount: users.failedLoginCount,
        lockedUntil: users.lockedUntil,
        mustChangePassword: users.mustChangePassword,
      })
      .from(users)
      .where(eq(sql`lower(${users.username})`, username));
    return row ?? null;
  }

  async recordFailure(
    tx: Tx,
    id: string,
    failure: { failedLoginCount: number; lockedUntil: Date | null },
  ): Promise<void> {
    await tx
      .update(users)
      .set({ ...failure, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  /** Login berhasil mengosongkan hitungan gagal (AC-01.06). */
  async recordSuccess(tx: Tx, id: string, at: Date): Promise<void> {
    await tx
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: at, updatedAt: at })
      .where(eq(users.id, id));
  }

  async findRefs(tx: Tx, ids: readonly string[]): Promise<UserRef[]> {
    if (ids.length === 0) return [];
    return tx
      .select({ id: users.id, username: users.username, roleName: roles.roleName })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(inArray(users.id, [...ids]));
  }

  async findProfile(tx: Tx, id: string): Promise<UserProfile | null> {
    const [row] = await tx
      .select({ id: users.id, username: users.username, fullName: users.fullName, roleName: roles.roleName })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.id, id));
    return row ?? null;
  }
}
