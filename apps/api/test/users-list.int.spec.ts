import { errorEnvelopeSchema, userListResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";
import { setUser } from "./support/task.js";

const APPROVE_ACCESS = "withAccess=OPS-APPROVAL:APPROVE";

/** Dropdown user, terutama "Approver" di Approval Hierarchy (api-specs 03 §3.6, AC-27.01, AC-27.02). */
describe("users list", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let sales: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    await db.owner.query("update iam.users set branch_id = $1 where username = 'kepala.cabang'", [
      seedOrganizationIds.bandung,
    ]);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const list = async (query: string) => {
    const res = await app.inject({ method: "GET", url: `/api/v1/users?${query}`, headers: maker.headers });
    expect(res.statusCode).toBe(200);
    return userListResponseSchema.parse(res.json());
  };

  it("AC-27.01 lists only active users with Approve on Approval for the Approver dropdown", async () => {
    const { data, meta } = await list(APPROVE_ACCESS);

    expect(data).toEqual([
      {
        id: expect.any(String),
        username: "approver.01",
        fullName: "Joko Approver",
        roleName: "Approver",
        branchCode: null,
        status: "ACTIVE",
      },
      {
        id: expect.any(String),
        username: "kepala.cabang",
        fullName: "Kartika Kepala Cabang",
        roleName: "Kepala Cabang",
        branchCode: "011",
        status: "ACTIVE",
      },
    ]);
    expect(meta.totalItems).toBe(2);
  });

  it("AC-27.02 leaves out a Sales user without Approve access", async () => {
    const { data } = await list(`${APPROVE_ACCESS}&q=sales`);

    expect(data).toEqual([]);
  });

  it("includes a user whose special access grants Approve today", async () => {
    await setUser(db.owner, sales.userId, { username: "sari.akses" });
    await db.owner.query(
      `insert into iam.user_access (id, tenant_id, user_id, menu_id, can_view, can_approve, valid_from, valid_to)
       select gen_random_uuid(), tenant_id, id, (select id from iam.menus where menu_code = 'OPS-APPROVAL'), true, true,
              current_date - 1, current_date + 1
       from iam.users where id = $1`,
      [sales.userId],
    );

    const { data } = await list(`${APPROVE_ACCESS}&q=sari.akses`);

    expect(data.map((user) => user.username)).toEqual(["sari.akses"]);
  });

  it("searches by full name, filters by status, and sorts by full name", async () => {
    const byName = await list("q=Joko");
    const inactive = await list("status=INACTIVE");
    const sorted = await list(`${APPROVE_ACCESS}&sort=fullName,desc&q=a`);

    expect(byName.data.map((user) => user.username)).toEqual(["approver.01"]);
    expect(inactive.data.map((user) => user.username)).toEqual(["sales.jkt02"]);
    expect(sorted.data.map((user) => user.fullName)).toEqual(
      [...sorted.data.map((user) => user.fullName)].sort().reverse(),
    );
  });

  it("rejects a malformed withAccess with VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users?withAccess=OPS-APPROVAL",
      headers: maker.headers,
    });

    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("refuses a user without View on User or Approval Setup (ACCESS_DENIED)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/users", headers: sales.headers });

    expect(res.statusCode).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "ACCESS_DENIED" });
  });
});
