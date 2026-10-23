import { errorEnvelopeSchema, parameterOptionsResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const COMPANY_002 = "0192b6f1-0002-7000-8000-000000000001";
const INACTIVE_OCCUPATION = "0192b6f1-0001-7000-8000-000000000001";
const OTHER_COMPANY_OCCUPATION = "0192b6f1-0002-7000-8000-000000000002";

/** Dropdown General Parameter (api-specs 06 §6.1) dengan seed `dev` company 001. */
describe("parameter options", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let maker: TestSession;
  let noAccess: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    noAccess = await createSession(db.owner, { roleId: null });
    await db.owner.query(
      `insert into masterdata.general_parameters (id, tenant_id, param_type, param_id, param_value, is_active)
       values ($1, $2, 'Occupation', '098', 'Nelayan', false)`,
      [INACTIVE_OCCUPATION, seedCompanyIds.company001],
    );
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    await db.owner.query(
      `insert into masterdata.general_parameters (id, tenant_id, param_type, param_id, param_value)
       values ($1, $2, 'Occupation', '777', 'Profesi Bank Lain')`,
      [OTHER_COMPANY_OCCUPATION, COMPANY_002],
    );
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const options = (session: TestSession, paramType: string, query = "") =>
    app.inject({
      method: "GET",
      url: `/api/v1/parameters/${encodeURIComponent(paramType)}/options${query}`,
      headers: session.headers,
    });
  const values = async (session: TestSession, paramType: string, query = "") => {
    const res = await options(session, paramType, query);
    expect(res.statusCode, res.body).toBe(200);
    return parameterOptionsResponseSchema.parse(res.json()).data;
  };

  it("lists the active Occupation values of the company, ordered by paramId, for a Sales with Application Entry", async () => {
    const data = await values(sales, "Occupation");

    expect(data.map((option) => option.paramValue)).toEqual([
      "Karyawan Swasta",
      "Pegawai Negeri Sipil",
      "TNI/Polri",
      "Pensiunan",
      "Wiraswasta",
      "Pelajar",
      "Pengemudi Daring",
    ]);
    expect(data[0]).toEqual({ paramId: "001", paramValue: "Karyawan Swasta", isActive: true });
  });

  it("lists the Document and Marital values for a Maker with master data View", async () => {
    expect((await values(maker, "Document")).map((option) => option.paramId)).toContain("SLIP_GAJI");
    expect((await values(maker, "Marital")).map((option) => option.paramValue)).toContain("Kawin");
  });

  it("offers inactive values only when includeInactive=true, for reading old data", async () => {
    expect((await values(sales, "Occupation")).map((option) => option.paramId)).not.toContain("098");
    expect(await values(sales, "Occupation", "?includeInactive=true")).toContainEqual({
      paramId: "098",
      paramValue: "Nelayan",
      isActive: false,
    });
  });

  it("never shows the values of another company", async () => {
    const data = await values(sales, "Occupation", "?includeInactive=true");

    expect(data.map((option) => option.paramId)).not.toContain("777");
  });

  it("accepts a ParamType with spaces and answers an empty list when the company has no values", async () => {
    expect(await values(sales, "Relation with Applicant")).toEqual([]);
  });

  it("answers 404 NOT_FOUND for an unknown ParamType", async () => {
    const res = await options(sales, "Favourite Colour");

    expect(res.statusCode, res.body).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers 403 ACCESS_DENIED without View on Application Entry, Inquiry, or a master data menu", async () => {
    const res = await options(noAccess, "Occupation");

    expect(res.statusCode, res.body).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("answers 400 VALIDATION_FAILED for an includeInactive that is not true or false", async () => {
    const res = await options(sales, "Occupation", "?includeInactive=yes");

    expect(res.statusCode, res.body).toBe(400);
  });
});
