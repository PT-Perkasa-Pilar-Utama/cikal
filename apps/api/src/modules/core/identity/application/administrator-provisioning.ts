import { randomBytes } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { tenantProvisioning } from "../db/tenant-provisioning.repository.js";
import { STANDARD_ROLES, type StandardRoleKey } from "../domain/standard-roles.js";
import { PasswordHasher } from "./password-hasher.js";

/** 18 byte acak menjadi 24 karakter base64url. */
const ONE_TIME_PASSWORD_BYTES = 18;

export interface AdministratorRequest {
  tenantId: string;
  username: string;
  fullName: string;
  email: string;
}

export interface ProvisionedAdministrator {
  username: string;
  /** Password sekali pakai; hanya dicetak ke terminal operator, tidak disimpan selain hash-nya. */
  oneTimePassword: string;
}

/** Role standar company baru dengan ID UUID v7; mengembalikan ID role Super User. */
async function provisionStandardRoles(db: NodePgDatabase, tenantId: string): Promise<string> {
  const roleIds = new Map<StandardRoleKey, string>();
  const roleIdOf = (key: StandardRoleKey): string => {
    const id = roleIds.get(key) ?? uuidv7();
    roleIds.set(key, id);
    return id;
  };
  await tenantProvisioning.insertStandardRoles(db, tenantId, { role: roleIdOf, access: () => uuidv7() });
  return roleIdOf("superUser");
}

/**
 * Role standar company (bila belum ada) dan admin pertama ber-role Super User (DEPLOYMENT_PLAN §3.6 langkah 5). Berjalan di transaksi
 * pemanggil dengan role pemilik skema; username yang sudah ada di instalasi ditolak.
 */
export async function provisionAdministrator(
  db: NodePgDatabase,
  request: AdministratorRequest,
): Promise<ProvisionedAdministrator> {
  if (await tenantProvisioning.usernameTaken(db, request.username)) {
    throw new Error(`Username ${request.username} already exists`);
  }
  const superUser = STANDARD_ROLES.superUser.name;
  const roleId =
    (await tenantProvisioning.roleId(db, request.tenantId, superUser)) ??
    (await provisionStandardRoles(db, request.tenantId));
  const oneTimePassword = randomBytes(ONE_TIME_PASSWORD_BYTES).toString("base64url");
  await tenantProvisioning.insertAdministrator(db, {
    id: uuidv7(),
    ...request,
    passwordHash: await new PasswordHasher().hash(oneTimePassword),
    roleId,
  });
  return { username: request.username, oneTimePassword };
}
