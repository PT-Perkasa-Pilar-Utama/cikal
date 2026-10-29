import { auditLogDetailResponseSchema, auditLogListResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const COMPANY_002 = "0192b6a0-0002-7000-8000-000000000002";
const OCTOBER = "occurredFrom=2026-10-01&occurredTo=2026-10-31";

interface Row {
  module: string;
  action: string;
  occurredAt: string;
  recordId?: string;
  userId?: string | null;
  ipAddress?: string | null;
  oldData?: unknown;
  newData?: unknown;
  tenantId?: string;
}

/** `GET /audit-logs` dan `GET /audit-logs/{id}`, halaman "Audit Trail" (api-specs 17 §17.2, §17.3, US-14). */
describe("audit trail search", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let auditor: TestSession;
  let auditorName: string;

  const insert = async (row: Row): Promise<string> => {
    const id = uuidv7();
    await db.owner.query(
      `insert into audit.audit_logs (id, tenant_id, user_id, role, module, action, record_id, description, old_data,
         new_data, ip_address, occurred_at)
       values ($1, $2, $3, 'Checker', $4, $5, $6, 'Uji', $7, $8, $9, $10)`,
      [
        id,
        row.tenantId ?? seedCompanyIds.company001,
        row.userId === undefined ? auditor.userId : row.userId,
        row.module,
        row.action,
        row.recordId ?? null,
        row.oldData === undefined ? null : JSON.stringify(row.oldData),
        row.newData === undefined ? null : JSON.stringify(row.newData),
        row.ipAddress ?? "10.10.1.25",
        row.occurredAt,
      ],
    );
    return id;
  };

  const get = (session: TestSession, url: string) => app.inject({ method: "GET", url, headers: session.headers });
  const list = async (query: string) => {
    const res = await get(auditor, `/api/v1/audit-logs?${query}`);
    expect(res.statusCode, res.body).toBe(200);
    return auditLogListResponseSchema.parse(res.json());
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    auditor = await createSession(db.owner, { roleId: seedRoleIds.auditor });
    const { rows } = await db.owner.query<{ username: string }>("select username from iam.users where id = $1", [
      auditor.userId,
    ]);
    auditorName = rows[0]?.username ?? "";
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-14.01 lists the Product activity of October 2026 by business date with date time, user, action, and record", async () => {
    const firstMinute = await insert({
      module: "Product",
      action: "APPROVE",
      recordId: "KTA",
      occurredAt: "2026-09-30T17:00:00Z",
    });
    const lastMinute = await insert({
      module: "Product",
      action: "SUBMIT",
      recordId: "KPR",
      occurredAt: "2026-10-31T16:59:00Z",
    });
    await insert({ module: "Product", action: "APPROVE", recordId: "OLD", occurredAt: "2026-09-30T16:59:00Z" });
    await insert({ module: "Product", action: "APPROVE", recordId: "NEXT", occurredAt: "2026-10-31T17:00:00Z" });
    await insert({ module: "Role Access", action: "APPROVE", recordId: "ROLE", occurredAt: "2026-10-15T03:00:00Z" });
    await insert({
      module: "Product",
      action: "APPROVE",
      occurredAt: "2026-10-15T03:00:00Z",
      tenantId: COMPANY_002,
      userId: null,
    });

    const body = await list(`module=Product&${OCTOBER}`);

    expect(body.data.map((item) => item.id)).toEqual([lastMinute, firstMinute]);
    expect(body.meta.totalItems).toBe(2);
    expect(body.data[1]).toMatchObject({
      occurredAt: "2026-09-30T17:00:00.000Z",
      user: { username: auditorName },
      role: "Checker",
      module: "Product",
      eventType: "MASTER_DATA",
      action: "APPROVE",
      recordId: "KTA",
      ipAddress: "10.10.1.25",
    });
    expect((await list(`module=Product&${OCTOBER}&sort=occurredAt,asc`)).data[0]?.id).toBe(firstMinute);
  });

  it("AC-14.02 shows the data before and after with the changed fields", async () => {
    const id = await insert({
      module: "Product",
      action: "APPROVE",
      recordId: "KTA",
      occurredAt: "2026-10-21T03:05:00Z",
      oldData: { productName: "KTA Karyawan", limitAutoApproval: "15000000.00" },
      newData: { productName: "KTA Karyawan", limitAutoApproval: "25000000.00" },
    });

    const res = await get(auditor, `/api/v1/audit-logs/${id}`);

    expect(res.statusCode, res.body).toBe(200);
    expect(auditLogDetailResponseSchema.parse(res.json()).data).toMatchObject({
      oldData: { limitAutoApproval: "15000000.00" },
      newData: { limitAutoApproval: "25000000.00" },
      changedFields: ["limitAutoApproval"],
    });
  });

  it("AC-14.03 refuses 31-10-2026 to 01-10-2026", async () => {
    const res = await get(auditor, "/api/v1/audit-logs?occurredFrom=2026-10-31&occurredTo=2026-10-01");
    expect(res.statusCode).toBe(422);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "INVALID_DATE_RANGE",
      message: "End date must be on or after start date",
    });
  });

  it("AC-14.04 refuses 01-01-2025 to 02-01-2026", async () => {
    const res = await get(auditor, "/api/v1/audit-logs?occurredFrom=2025-01-01&occurredTo=2026-01-02");
    expect(res.statusCode).toBe(422);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "DATE_RANGE_TOO_LONG",
      message: "Search period must not exceed 366 days",
    });
    expect((await get(auditor, "/api/v1/audit-logs?occurredFrom=2025-01-01&occurredTo=2026-01-01")).statusCode).toBe(
      200,
    );
  });

  it("AC-14.05 has no route to change or delete an audit row", async () => {
    const id = await insert({ module: "Product", action: "UPDATE", occurredAt: "2026-10-22T03:00:00Z" });
    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      const res = await app.inject({ method, url: `/api/v1/audit-logs/${id}`, headers: auditor.headers, payload: {} });
      expect(res.statusCode, method).toBe(404);
    }
  });

  it("AC-14.06 filters Authentication to login, failed login, and logout with the IP address", async () => {
    const day = "occurredFrom=2026-10-05&occurredTo=2026-10-05";
    for (const [action, ip] of [
      ["LOGIN", "10.30.0.1"],
      ["LOGIN_FAILED", "10.30.0.2"],
      ["LOGOUT", "10.30.0.3"],
    ] as const) {
      await insert({ module: "Authentication", action, ipAddress: ip, occurredAt: "2026-10-05T02:00:00Z" });
    }
    await insert({ module: "Application", action: "VIEW_APPLICATION", occurredAt: "2026-10-05T02:00:00Z" });
    await insert({ module: "Approval", action: "APPROVE", occurredAt: "2026-10-05T02:00:00Z" });

    const authentication = await list(`eventType=AUTHENTICATION&${day}`);
    expect(authentication.data.map((item) => [item.action, item.ipAddress]).sort()).toEqual([
      ["LOGIN", "10.30.0.1"],
      ["LOGIN_FAILED", "10.30.0.2"],
      ["LOGOUT", "10.30.0.3"],
    ]);
    expect((await list(`eventType=DATA_ACCESS&${day}`)).data.map((item) => item.action)).toEqual(["VIEW_APPLICATION"]);
    expect((await list(`eventType=APPLICATION_ACTION&${day}`)).data.map((item) => item.module)).toEqual(["Approval"]);
    expect((await list(`eventType=MASTER_DATA&${day}`)).data).toEqual([]);
  });

  it("filters by user and record and shows a system action without a user", async () => {
    const system = await insert({
      module: "Process Monitoring",
      action: "PROCESS_FINISHED",
      recordId: "LOAN-1",
      userId: null,
      occurredAt: "2026-10-06T02:00:00Z",
    });
    const day = "occurredFrom=2026-10-06&occurredTo=2026-10-06";

    const byRecord = await list(`recordId=LOAN-1&${day}`);
    expect(byRecord.data).toEqual([expect.objectContaining({ id: system, user: null })]);
    expect((await list(`userId=${auditor.userId}&${day}`)).data).toEqual([]);
  });

  it("returns NOT_FOUND for an unknown or another company's audit row", async () => {
    const other = await insert({
      module: "Product",
      action: "CREATE",
      occurredAt: "2026-10-07T02:00:00Z",
      tenantId: COMPANY_002,
      userId: null,
    });
    for (const id of [uuidv7(), other]) {
      const res = await get(auditor, `/api/v1/audit-logs/${id}`);
      expect(res.statusCode).toBe(404);
      expect(errorEnvelopeSchema.parse(res.json()).code).toBe("NOT_FOUND");
    }
  });

  it("refuses a user without Audit Trail View", async () => {
    const roleId = await createRole(db.owner, "Tanpa Audit", [{ menuCode: "APP-INQUIRY", view: true }]);
    const session = await createSession(db.owner, { roleId });
    for (const url of [`/api/v1/audit-logs?${OCTOBER}`, `/api/v1/audit-logs/${uuidv7()}`]) {
      const res = await get(session, url);
      expect(res.statusCode).toBe(403);
      expect(errorEnvelopeSchema.parse(res.json()).code).toBe("ACCESS_DENIED");
    }
  });

  it("refuses a search without a period", async () => {
    const res = await get(auditor, "/api/v1/audit-logs?module=Product");
    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json()).code).toBe("VALIDATION_FAILED");
  });
});
