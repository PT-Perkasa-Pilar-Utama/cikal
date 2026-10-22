import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { lastAudit } from "./support/change-request.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createLoginUser, login } from "./support/login.js";

const PASSWORD = "Right-Pass-1";

/** Jejak audit login dan logout (api-specs 02 §2.2, §2.3) dan sifat append-only (AC-14.05, AD-03). */
describe("audit trail", () => {
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

  const salesUser = (username: string) =>
    createLoginUser(db.owner, { username, password: PASSWORD, roleId: seedRoleIds.sales });

  /** Menjalankan `sql` sebagai role aplikasi di dalam tenant company 001. */
  const asApp = async (sql: string) => {
    const client = await db.app.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.tenant_id', $1, true)", [seedCompanyIds.company001]);
      return await client.query(sql);
    } finally {
      await client.query("rollback");
      client.release();
    }
  };

  it("records a successful login with the role and IP address", async () => {
    const userId = await salesUser("audit.login01");
    await login(app, "audit.login01", PASSWORD, "10.30.0.1");
    expect(await lastAudit(db.owner, userId, "LOGIN")).toMatchObject({
      role: "Sales",
      module: "Authentication",
      ip_address: "10.30.0.1",
    });
  });

  it("records a failed login of a registered user with the reason and IP address", async () => {
    const userId = await salesUser("audit.failed01");
    await login(app, "audit.failed01", "Wrong-Password-9", "10.30.0.2");
    expect(await lastAudit(db.owner, userId, "LOGIN_FAILED")).toMatchObject({
      module: "Authentication",
      description: "INVALID_CREDENTIALS",
      ip_address: "10.30.0.2",
    });
  });

  it("records a logout with the IP address", async () => {
    const userId = await salesUser("audit.logout01");
    const { headers } = await login(app, "audit.logout01", PASSWORD, "10.30.0.3");
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers, remoteAddress: "10.30.0.4" });
    expect(res.statusCode).toBe(204);
    expect(await lastAudit(db.owner, userId, "LOGOUT")).toMatchObject({
      module: "Authentication",
      ip_address: "10.30.0.4",
    });
  });

  it("lets the application role add audit rows", async () => {
    const insert = asApp(
      `insert into audit.audit_logs (id, tenant_id, module, action)
       values ('0192b6a6-0001-7000-8000-000000000001', '${seedCompanyIds.company001}', 'Product', 'CREATE')`,
    );
    await expect(insert).resolves.toMatchObject({ rowCount: 1 });
  });

  it("does not let the application change an audit row (AC-14.05)", async () => {
    await expect(asApp("update audit.audit_logs set description = 'diubah'")).rejects.toThrow(/permission denied/);
  });

  it("does not let the application delete an audit row (AC-14.05)", async () => {
    await expect(asApp("delete from audit.audit_logs")).rejects.toThrow(/permission denied/);
  });

  it("does not let the application empty the audit table (AC-14.05)", async () => {
    await expect(asApp("truncate audit.audit_logs")).rejects.toThrow(/permission denied/);
  });
});
