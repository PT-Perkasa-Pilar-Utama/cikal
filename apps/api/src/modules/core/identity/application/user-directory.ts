import type { Action, MenuCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { UserDirectoryPort, UserRef, UserScope } from "../../../../platform/http/user-directory-port.js";
import { Licensing } from "../../tenancy/index.js";
import { AccessRepository } from "../db/access.repository.js";
import { UsersRepository } from "../db/users.repository.js";
import { decideAccess } from "../domain/access-policy.js";

/** Nama user dan role untuk modul lain lewat `USER_DIRECTORY_PORT` (technical-specs 05 §5.1). */
@Injectable()
export class UserDirectory implements UserDirectoryPort {
  constructor(
    private readonly users: UsersRepository,
    private readonly access: AccessRepository,
    private readonly licensing: Licensing,
  ) {}

  async describe(tx: Tx, userIds: readonly string[]): Promise<Map<string, UserRef>> {
    const refs = await this.users.findRefs(tx, [...new Set(userIds)]);
    return new Map(refs.map((ref) => [ref.id, ref]));
  }

  scope(tx: Tx, userId: string): Promise<UserScope | null> {
    return this.users.findScope(tx, userId);
  }

  async hasAccess(tx: Tx, userId: string, menuCode: MenuCode, action: Action): Promise<boolean> {
    const user = await this.users.findAuthState(tx, userId);
    if (user?.status !== "ACTIVE") return false;
    const facts = await this.access.findMenuAccess(tx, userId, menuCode, businessDate(new Date()));
    const { modules } = await this.licensing.state(tx);
    return decideAccess({ ...facts, licensedModules: modules, licenseExempt: false }, action) === "ALLOW";
  }
}
