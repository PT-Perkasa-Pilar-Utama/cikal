import { errorEnvelopeSchema, sessionResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { SEED_USER_PASSWORD, startDatabase, type TestDatabase } from "./support/database.js";
import { createLoginUser, login } from "./support/login.js";

/** Sesi dan logout web (api-specs 02 §2.1, §2.3, §2.4). */
describe("web sessions", () => {
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

  const getSession = (headers: Record<string, string>) =>
    app.inject({ method: "GET", url: "/api/v1/auth/session", headers });
  const errorOf = (res: { json(): unknown }) => errorEnvelopeSchema.parse(res.json());

  it("returns the header identity, licence, and menus of the signed-in user (AC-01.01, AC-09.02)", async () => {
    const maker = await login(app, "maker.01", SEED_USER_PASSWORD);
    const res = await getSession(maker.headers);
    expect(res.statusCode).toBe(200);
    const { data } = sessionResponseSchema.parse(res.json());
    expect(data).toMatchObject({
      user: { username: "maker.01", fullName: "Andi Pratama", roleName: "Maker", branchCode: null },
      company: { companyCode: "001", companyName: "Bank Contoh", platformCode: "01" },
      license: { status: "ACTIVE", validTo: null, modules: ["CORE", "M06", "M07", "M08", "M09", "M10", "M11", "M15"] },
      idleTimeoutMinutes: 30,
    });
    const master = data.menus.find((m) => m.menuCode === "MST");
    expect(master?.children.find((m) => m.menuCode === "MST-PRODUCT")?.actions).toEqual([
      "VIEW",
      "CREATE",
      "UPDATE",
      "DELETE",
    ]);
    expect(data.menus.map((m) => m.menuCode)).not.toContain("SYS");
  });

  it("hides the Product menu from a Sales (AC-09.02 TRM_ACC_001)", async () => {
    const sales = await login(app, "sales.jkt01", SEED_USER_PASSWORD);
    const { data } = sessionResponseSchema.parse((await getSession(sales.headers)).json());
    expect(data.menus.map((m) => m.menuCode)).toEqual(["APP"]);
  });

  it("logs out, clears both cookies, and refuses the old cookie afterwards (AC-06.01)", async () => {
    const checker = await login(app, "checker.001", SEED_USER_PASSWORD);
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: checker.headers });
    expect(res.statusCode).toBe(204);
    for (const name of ["cikal_sid", "cikal_csrf"]) {
      expect(res.cookies.find((c) => c.name === name)).toMatchObject({ value: "", maxAge: 0 });
    }
    expect(errorOf(await getSession(checker.headers))).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("sends a logged-out user who opens an app page back to Login with 401 (AC-06.02)", async () => {
    const maker = await login(app, "maker.01", SEED_USER_PASSWORD);
    await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: maker.headers });
    const res = await app.inject({ method: "GET", url: "/api/v1/products", headers: maker.headers });
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Your session has expired. Please log in again",
    });
  });

  it("answers logout without a session with 204", async () => {
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/logout" })).statusCode).toBe(204);
  });

  it("refuses logout without the matching X-CSRF-Token with CSRF_TOKEN_INVALID", async () => {
    const maker = await login(app, "maker.01", SEED_USER_PASSWORD);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: maker.headers.cookie ?? "" },
    });
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({ code: "CSRF_TOKEN_INVALID" });
  });

  const idleFor = (minutes: number, username: string) =>
    db.owner.query(
      `update iam.sessions set last_activity_at = now() - make_interval(mins => $1)
       where ended_reason is null and user_id = (select id from iam.users where username = $2)`,
      [minutes, username],
    );

  it("expires the session after 30 minutes without activity (AC-06.03)", async () => {
    const verifikator = await login(app, "verifikator.01", SEED_USER_PASSWORD);
    await idleFor(30, "verifikator.01");
    const res = await getSession(verifikator.headers);
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject({
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please log in again",
    });
  });

  it("keeps the session active at minute 29 (AC-06.04)", async () => {
    const supervisor = await login(app, "supervisor.01", SEED_USER_PASSWORD);
    await idleFor(29, "supervisor.01");
    expect((await getSession(supervisor.headers)).statusCode).toBe(200);
  });

  it("ends the first browser's session when the user logs in from another browser (AC-06.05)", async () => {
    await createLoginUser(db.owner, { username: "sales.twice", password: "Right-Pass-1", roleId: seedRoleIds.sales });
    const laptop = await login(app, "sales.twice", "Right-Pass-1");
    const other = await login(app, "sales.twice", "Right-Pass-1");
    const res = await getSession(laptop.headers);
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject({
      code: "SESSION_REPLACED",
      message: "Your session was ended because you logged in from another browser",
    });
    expect((await getSession(other.headers)).statusCode).toBe(200);
  });

  it("keeps the session route open while the initial password must be changed", async () => {
    await createLoginUser(db.owner, {
      username: "sales.newpass",
      password: "Right-Pass-1",
      roleId: seedRoleIds.sales,
      mustChangePassword: true,
    });
    const user = await login(app, "sales.newpass", "Right-Pass-1");
    const res = await getSession(user.headers);
    expect(res.statusCode).toBe(200);
    expect(sessionResponseSchema.parse(res.json()).data.mustChangePassword).toBe(true);
  });
});
