import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { PasswordHasher } from "../../src/modules/core/identity/application/password-hasher.js";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";

const hasher = new PasswordHasher();
let addressCounter = 0;

/** Alamat IP unik per uji agar rate limit login 10 per menit per IP tidak saling memengaruhi. */
export function nextAddress(): string {
  addressCounter += 1;
  return `10.20.${Math.floor(addressCounter / 250)}.${(addressCounter % 250) + 1}`;
}

/** User lokal dengan password asli (Argon2id) untuk uji login. */
export async function createLoginUser(
  owner: pg.Pool,
  options: { username: string; password: string; roleId: string | null; status?: string; mustChangePassword?: boolean },
): Promise<string> {
  const id = uuidv7();
  await owner.query(
    `insert into iam.users (id, tenant_id, username, full_name, email, password_hash, must_change_password, role_id, status)
     values ($1, $2, $3, 'Pengguna Login', $4, $5, $6, $7, $8)`,
    [
      id,
      seedCompanyIds.company001,
      options.username,
      `${options.username}@contoh.co.id`,
      await hasher.hash(options.password),
      options.mustChangePassword ?? false,
      options.roleId,
      options.status ?? "ACTIVE",
    ],
  );
  return id;
}

export interface LoggedIn {
  /** Header request berikutnya: kedua cookie dan `X-CSRF-Token`. */
  headers: Record<string, string>;
  status: number;
}

/** `POST /api/v1/auth/login` lalu bentuk header sesi dari `Set-Cookie`. */
export async function login(
  app: NestFastifyApplication,
  username: string,
  password: string,
  remoteAddress = nextAddress(),
): Promise<LoggedIn> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username, password },
    remoteAddress,
  });
  const cookie = (name: string) => res.cookies.find((c) => c.name === name)?.value ?? "";
  const sid = cookie("cikal_sid");
  const csrf = cookie("cikal_csrf");
  return { status: res.statusCode, headers: { cookie: `cikal_sid=${sid}; cikal_csrf=${csrf}`, "x-csrf-token": csrf } };
}
