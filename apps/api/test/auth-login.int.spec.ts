import { errorEnvelopeSchema, loginResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { SEED_USER_PASSWORD, startDatabase, type TestDatabase } from "./support/database.js";
import { createLoginUser, nextAddress } from "./support/login.js";

const WRONG = "Wrong-Password-9";
const invalidCredentials = { code: "INVALID_CREDENTIALS", message: "Invalid username or password" };
const locked = {
  code: "ACCOUNT_LOCKED",
  message: "Your account is locked for 15 minutes due to too many failed attempts",
};

/** Login web (api-specs 02 §2.2). */
describe("POST /auth/login", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const loginRaw = (payload: object, remoteAddress = nextAddress()) =>
    app.inject({ method: "POST", url: "/api/v1/auth/login", payload, remoteAddress });
  const errorOf = (res: { json(): unknown }) => errorEnvelopeSchema.parse(res.json());
  const failedCount = async (username: string) =>
    (
      await db.owner.query<{ n: number }>("select failed_login_count as n from iam.users where username = $1", [
        username,
      ])
    ).rows[0]?.n;

  it("signs a Sales in and returns the name, role, and company for the header (AC-01.01)", async () => {
    const res = await loginRaw({ username: "sales.jkt01", password: SEED_USER_PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(loginResponseSchema.parse(res.json()).data).toMatchObject({
      user: { username: "sales.jkt01", fullName: "Sari Wulandari", roleName: "Sales" },
      company: { companyCode: "001", companyName: "Bank Contoh" },
      mustChangePassword: false,
    });
    const sid = res.cookies.find((c) => c.name === "cikal_sid");
    const csrf = res.cookies.find((c) => c.name === "cikal_csrf");
    expect(sid).toMatchObject({ httpOnly: true, secure: true, sameSite: "Strict", path: "/api" });
    expect(csrf).toMatchObject({ secure: true, sameSite: "Strict", path: "/" });
    expect(csrf?.httpOnly).toBeUndefined();
  });

  it("rejects a wrong password with the uniform message (AC-01.02)", async () => {
    await createLoginUser(db.owner, { username: "sales.wrong01", password: "Right-Pass-1", roleId: seedRoleIds.sales });
    const res = await loginRaw({ username: "sales.wrong01", password: WRONG });
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject(invalidCredentials);
  });

  it("rejects an unknown username with exactly the wrong-password message (AC-01.03)", async () => {
    await createLoginUser(db.owner, { username: "sales.wrong02", password: "Right-Pass-1", roleId: seedRoleIds.sales });
    const unknown = await loginRaw({ username: "tidak.terdaftar", password: "Abc12345!" });
    const wrong = await loginRaw({ username: "sales.wrong02", password: WRONG });
    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect({ ...errorOf(unknown), correlationId: "" }).toEqual({ ...errorOf(wrong), correlationId: "" });
  });

  it("asks for both fields when they are empty (AC-01.04)", async () => {
    const res = await loginRaw({ username: "", password: "" });
    expect(res.statusCode).toBe(400);
    expect(errorOf(res)).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [
        expect.objectContaining({ field: "username", message: "Username is required" }),
        expect.objectContaining({ field: "password", message: "Password is required" }),
      ],
    });
  });

  it("locks the account on the fifth wrong password and refuses the right one for 15 minutes (AC-01.05)", async () => {
    await createLoginUser(db.owner, { username: "sales.lock01", password: "Right-Pass-1", roleId: seedRoleIds.sales });
    for (let attempt = 1; attempt <= 4; attempt++) {
      expect(errorOf(await loginRaw({ username: "sales.lock01", password: WRONG }))).toMatchObject(invalidCredentials);
    }
    const fifth = await loginRaw({ username: "sales.lock01", password: WRONG });
    expect(fifth.statusCode).toBe(423);
    expect(errorOf(fifth)).toMatchObject(locked);

    const right = await loginRaw({ username: "sales.lock01", password: "Right-Pass-1" });
    expect(right.statusCode).toBe(423);
    expect(errorOf(right)).toMatchObject(locked);
    const { rows } = await db.owner.query<{ minutes: number }>(
      "select round(extract(epoch from locked_until - now()) / 60)::int as minutes from iam.users where username = $1",
      ["sales.lock01"],
    );
    expect(rows[0]?.minutes).toBe(15);
  });

  it("signs in after four failures and resets the failure count to 0 (AC-01.06)", async () => {
    await createLoginUser(db.owner, { username: "sales.retry01", password: "Right-Pass-1", roleId: seedRoleIds.sales });
    for (let attempt = 1; attempt <= 4; attempt++) {
      await loginRaw({ username: "sales.retry01", password: WRONG });
    }
    expect(await failedCount("sales.retry01")).toBe(4);
    expect((await loginRaw({ username: "sales.retry01", password: "Right-Pass-1" })).statusCode).toBe(200);
    expect(await failedCount("sales.retry01")).toBe(0);
  });

  it("rejects an Inactive user with the right password (AC-01.07)", async () => {
    const res = await loginRaw({ username: "sales.jkt02", password: SEED_USER_PASSWORD });
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({
      code: "ACCOUNT_INACTIVE",
      message: "Your account is inactive. Please contact your administrator",
    });
  });

  it("treats an injection pattern as plain text and denies access (AC-01.08)", async () => {
    const res = await loginRaw({ username: "admin' OR '1'='1", password: "x" });
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject(invalidCredentials);
    expect(res.cookies.find((c) => c.name === "cikal_sid")).toBeUndefined();
  });

  it("rejects a user without a role with ACCOUNT_NO_ROLE", async () => {
    await createLoginUser(db.owner, { username: "new.norole", password: "Right-Pass-1", roleId: null });
    const res = await loginRaw({ username: "new.norole", password: "Right-Pass-1" });
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({
      code: "ACCOUNT_NO_ROLE",
      message: "Your account has no role yet. Please contact your administrator",
    });
  });

  it("matches the username without regard to letter case", async () => {
    expect((await loginRaw({ username: "SALES.JKT01", password: SEED_USER_PASSWORD })).statusCode).toBe(200);
  });

  it("records every attempt with the caller's IP address", async () => {
    await loginRaw({ username: "tidak.terdaftar.2", password: "x" }, "10.99.0.7");
    const { rows } = await db.owner.query(
      "select success, host(ip_address) as ip from iam.login_attempts where username = 'tidak.terdaftar.2'",
    );
    expect(rows).toEqual([{ success: false, ip: "10.99.0.7" }]);
  });

  it("limits login to 10 requests per minute per IP with RATE_LIMITED", async () => {
    const address = nextAddress();
    for (let attempt = 1; attempt <= 10; attempt++) {
      await loginRaw({ username: "tidak.terdaftar", password: "x" }, address);
    }
    const res = await loginRaw({ username: "tidak.terdaftar", password: "x" }, address);
    expect(res.statusCode).toBe(429);
    expect(errorOf(res)).toMatchObject({ code: "RATE_LIMITED", message: "Too many requests. Please try again later" });
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
});
