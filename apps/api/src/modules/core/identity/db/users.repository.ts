import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { users } from "./schema.js";

export interface UserAuthState {
  status: string;
  mustChangePassword: boolean;
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
}
