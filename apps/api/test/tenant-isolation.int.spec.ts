import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { hashToken } from "../src/platform/http/session-token.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession } from "./support/session.js";

const company002 = "0192b6a0-0002-7000-8000-000000000002";
const roleNames = (rows: Record<string, unknown>[]) => rows.map((row) => row.role_name);

/** RLS DM-09 dan konteks tenant dari sesi (technical-specs 07 §7.3, TN-03). */
describe("tenant isolation", () => {
  let db: TestDatabase;
  let tenantTx: TenantTx;
  let app: NestFastifyApplication;
  const ctx001 = { tenantId: seedCompanyIds.company001, userId: "0192b6a7-0001-7000-8000-000000000001" };

  beforeAll(async () => {
    db = await startDatabase("dev");
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [company002],
    );
    await createRole(db.owner, "Maker Bank Lain", [{ menuCode: "MST-PRODUCT", view: true }], company002);
    tenantTx = new TenantTx(drizzle(db.app));
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("shows only the session tenant's rows inside withTenantTx", async () => {
    const { rows } = await tenantTx.withTenantTx(ctx001, (tx) => tx.execute(sql`select role_name from iam.roles`));
    expect(roleNames(rows)).toContain("Maker");
    expect(roleNames(rows)).not.toContain("Maker Bank Lain");
  });

  it("shows no rows to a transaction without a tenant", async () => {
    const { rows } = await db.app.query("select id from iam.roles");
    expect(rows).toEqual([]);
  });

  it("rejects writing a row for another tenant", async () => {
    await expect(
      tenantTx.withTenantTx(ctx001, (tx) =>
        tx.execute(
          sql`insert into iam.roles (id, tenant_id, role_name) values ('0192b6a7-0002-7000-8000-000000000002', ${company002}, 'Penyusup')`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/row-level security/) } });
  });

  it("finds only the session whose token hash is set before the tenant is known (DM-12)", async () => {
    const session = await createSession(db.owner, { roleId: seedRoleIds.maker });
    const lookup = (token: string) =>
      tenantTx.withLookupTx("app.session_token_hash", hashToken(token).toString("hex"), (tx) =>
        tx.execute(sql`select id from iam.sessions`),
      );
    expect((await lookup(session.token)).rows).toEqual([{ id: session.sessionId }]);
    expect((await lookup("another-token")).rows).toEqual([]);
  });

  it("authorizes with the session tenant's roles and ignores a tenant in the request", async () => {
    const roleId = await createRole(
      db.owner,
      "Viewer Bank Lain",
      [{ menuCode: "MST-PRODUCT", view: true }],
      company002,
    );
    const other = await createSession(db.owner, { roleId, tenantId: company002 });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/products?tenantId=${seedCompanyIds.company001}`,
      headers: other.headers,
    });
    expect(res.statusCode).toBe(200);
  });
});
