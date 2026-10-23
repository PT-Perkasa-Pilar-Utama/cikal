import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { UserDirectoryPort, UserRef, UserScope } from "../../../../platform/http/user-directory-port.js";
import { UsersRepository } from "../db/users.repository.js";

/** Nama user dan role untuk modul lain lewat `USER_DIRECTORY_PORT` (technical-specs 05 §5.1). */
@Injectable()
export class UserDirectory implements UserDirectoryPort {
  constructor(private readonly users: UsersRepository) {}

  async describe(tx: Tx, userIds: readonly string[]): Promise<Map<string, UserRef>> {
    const refs = await this.users.findRefs(tx, [...new Set(userIds)]);
    return new Map(refs.map((ref) => [ref.id, ref]));
  }

  scope(tx: Tx, userId: string): Promise<UserScope | null> {
    return this.users.findScope(tx, userId);
  }
}
