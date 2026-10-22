import { randomBytes } from "node:crypto";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { CSRF_COOKIE, CSRF_HEADER, hashToken, SESSION_COOKIE } from "../../src/platform/http/session-token.js";

export interface TestSession {
  userId: string;
  sessionId: string;
  token: string;
  /** Header request terautentikasi: cookie sesi, cookie CSRF, dan `X-CSRF-Token`. */
  headers: Record<string, string>;
}

const MINUTE_MS = 60_000;
const ABSOLUTE_MS = 12 * 60 * MINUTE_MS;

/**
 * User dan sesi WEB yang ditulis langsung ke `iam` lewat role pemilik skema, karena login dibangun di BE-S1-01.
 * `idleMinutes` dan `expiresInMinutes` menggeser waktu sesi untuk uji idle dan batas absolut.
 */
export async function createSession(
  owner: pg.Pool,
  options: {
    roleId: string | null;
    tenantId?: string;
    status?: string;
    mustChangePassword?: boolean;
    idleMinutes?: number;
    expiresInMinutes?: number;
  },
): Promise<TestSession> {
  const tenantId = options.tenantId ?? seedCompanyIds.company001;
  const userId = uuidv7();
  const username = `user.${userId.slice(-12)}`;
  await owner.query(
    `insert into iam.users (id, tenant_id, username, full_name, email, password_hash, must_change_password, role_id, status)
     values ($1, $2, $3, 'Pengguna Uji', $4, 'not-a-real-hash', $5, $6, $7)`,
    [
      userId,
      tenantId,
      username,
      `${username}@contoh.co.id`,
      options.mustChangePassword ?? false,
      options.roleId,
      options.status ?? "ACTIVE",
    ],
  );

  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  const sessionId = uuidv7();
  const now = Date.now();
  await owner.query(
    `insert into iam.sessions (id, tenant_id, user_id, token_hash, channel, csrf_token_hash, last_activity_at, expires_at)
     values ($1, $2, $3, $4, 'WEB', $5, $6, $7)`,
    [
      sessionId,
      tenantId,
      userId,
      hashToken(token),
      hashToken(csrf),
      new Date(now - (options.idleMinutes ?? 0) * MINUTE_MS),
      new Date(now + (options.expiresInMinutes === undefined ? ABSOLUTE_MS : options.expiresInMinutes * MINUTE_MS)),
    ],
  );
  return {
    userId,
    sessionId,
    token,
    headers: { cookie: `${SESSION_COOKIE}=${token}; ${CSRF_COOKIE}=${csrf}`, [CSRF_HEADER]: csrf },
  };
}

/** Role uji dengan hak tertentu pada satu menu (baris MRTM). */
export async function createRole(
  owner: pg.Pool,
  name: string,
  grants: {
    menuCode: string;
    view?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    approve?: boolean;
  }[],
  tenantId: string = seedCompanyIds.company001,
): Promise<string> {
  const roleId = uuidv7();
  await owner.query("insert into iam.roles (id, tenant_id, role_name) values ($1, $2, $3)", [roleId, tenantId, name]);
  for (const grant of grants) {
    await owner.query(
      `insert into iam.role_access (id, tenant_id, role_id, menu_id, can_view, can_create, can_update, can_delete, can_approve)
       select $1, $2, $3, id, $5, $6, $7, $8, $9 from iam.menus where menu_code = $4`,
      [
        uuidv7(),
        tenantId,
        roleId,
        grant.menuCode,
        grant.view ?? false,
        grant.create ?? false,
        grant.update ?? false,
        grant.delete ?? false,
        grant.approve ?? false,
      ],
    );
  }
  return roleId;
}
