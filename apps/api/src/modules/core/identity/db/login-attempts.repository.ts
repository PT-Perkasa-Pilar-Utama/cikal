import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { loginAttempts } from "./schema.js";

/** Akses tabel `iam.login_attempts` [instalasi] (technical-specs 06 §6.4). */
@Injectable()
export class LoginAttemptsRepository {
  async record(tx: Tx, attempt: { username: string; success: boolean; ipAddress: string }): Promise<void> {
    await tx.insert(loginAttempts).values({ id: uuidv7(), ...attempt });
  }
}
