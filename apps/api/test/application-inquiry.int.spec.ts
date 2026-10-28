import { randomBytes } from "node:crypto";
import { type ApplicationStatus, applicationInquiryResponseSchema, errorEnvelopeSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { sectionClient, submittableProduct } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const COMPANY_002 = "0192b6a0-0002-7000-8000-000000000002";

interface Copy {
  fullName: string;
  status?: ApplicationStatus;
  state?: string | null;
  branchId?: string | null;
  createdBy?: string;
  updatedAt?: string;
  submittedAt?: string;
  tenantId?: string;
  productId?: string;
}

/** `GET /applications`, halaman "Application Inquiry" (api-specs 17 §17.1, US-83). */
describe("application inquiry", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let otherSales: TestSession;
  let bandungViewer: TestSession;
  let templateId: string;
  let copies = 0;

  /**
   * Token 12 huruf acak per uji agar pencarian `q` (cocok sebagian) hanya menemukan baris uji itu. Huruf dari UUID v7
   * tidak cukup: awalannya dari timestamp sama untuk semua uji dan sebagian token lebih pendek, sehingga token satu uji
   * bisa menjadi bagian nama uji lain.
   */
  const token = () => `Q${Array.from(randomBytes(12), (byte) => String.fromCharCode(65 + (byte % 26))).join("")}`;
  const list = async (session: TestSession, query: string) => {
    const res = await app.inject({ method: "GET", url: `/api/v1/applications?${query}`, headers: session.headers });
    expect(res.statusCode, res.body).toBe(200);
    return applicationInquiryResponseSchema.parse(res.json());
  };
  /** Salinan pengajuan contoh dengan NIK terenkripsi yang sama dan nama, status, langkah, serta cabang sendiri. */
  const copy = async (options: Copy) => {
    copies += 1;
    const id = uuidv7();
    const status = options.status ?? "ON_PROGRESS";
    await db.owner.query(
      `insert into application.applications (id, tenant_id, loan_id, channel, product_category, product_id, status,
         current_step, branch_id, requested_limit, submitted_at, created_by, updated_at)
       select $2, $3, $4, channel, product_category, coalesce($5, product_id), $6, $7, $8, requested_limit,
         $9::timestamptz, coalesce($10, created_by), $11::timestamptz
       from application.applications where id = $1`,
      [
        templateId,
        id,
        options.tenantId ?? seedCompanyIds.company001,
        `27102026INQ${String(copies).padStart(7, "0")}`,
        options.productId ?? null,
        status,
        options.state === undefined ? (status === "DRAFT" ? null : "DEDUP") : options.state,
        options.branchId ?? null,
        status === "DRAFT" ? null : (options.submittedAt ?? "2026-10-20T07:30:00Z"),
        options.createdBy ?? null,
        options.updatedAt ?? new Date().toISOString(),
      ],
    );
    await db.owner.query(
      `insert into application.application_personals (application_id, tenant_id, full_name, full_name_id, id_type,
         id_card_number_enc, id_card_number_key_version, id_card_number_bidx)
       select $2, $3, $4, upper($4), id_type, id_card_number_enc, id_card_number_key_version, id_card_number_bidx
       from application.application_personals where application_id = $1`,
      [templateId, id, options.tenantId ?? seedCompanyIds.company001, options.fullName],
    );
    return id;
  };
  const ids = (body: { data: { id: string }[] }) => body.data.map((row) => row.id);

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const salesRole = await createRole(db.owner, "Sales Inquiry", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
      { menuCode: "APP-INQUIRY", view: true },
    ]);
    sales = await createSession(db.owner, { roleId: salesRole });
    otherSales = await createSession(db.owner, { roleId: salesRole });
    bandungViewer = await createSession(db.owner, { roleId: salesRole });
    await db.owner.query("update iam.users set branch_id = $2 where id = $1", [
      bandungViewer.userId,
      seedOrganizationIds.bandung,
    ]);
    templateId = await sectionClient(app).createDraft(sales, await submittableProduct(db.owner));
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-83.01 finds a name containing rudi regardless of case and masks the NIK", async () => {
    const name = `RUDI HARTONO ${token()}`;
    const id = await copy({ fullName: name });

    const body = await list(sales, "q=rudi&pageSize=100");

    expect(body.data.find((row) => row.id === id)).toMatchObject({
      fullName: name,
      idCardNumberMasked: "3273********0001",
      productCode: expect.stringMatching(/^U/),
      requestedLimit: "20000000.00",
      status: "ON_PROGRESS",
      state: "DEDUP",
      submittedAt: "2026-10-20T07:30:00.000Z",
    });
  });

  it("AC-83.01 finds a partial Loan ID", async () => {
    const id = await copy({ fullName: `Sinta ${token()}` });
    const loanId = (await list(sales, `q=sinta&pageSize=100`)).data.find((row) => row.id === id)?.loanId ?? "";

    expect(ids(await list(sales, `q=${loanId.slice(-9)}`))).toEqual([id]);
  });

  it("AC-83.02 shows only applications at the Approval step", async () => {
    const name = token();
    const approval = await copy({ fullName: name, state: "APPROVAL" });
    await copy({ fullName: name, state: "DEDUP" });

    expect(ids(await list(sales, `q=${name}&state=APPROVAL`))).toEqual([approval]);
  });

  it("AC-83.03 sorts by Modified Date newest first, then oldest first", async () => {
    const name = token();
    const old = await copy({ fullName: name, updatedAt: "2026-10-01T00:00:00Z" });
    const recent = await copy({ fullName: name, updatedAt: "2026-10-21T00:00:00Z" });
    const middle = await copy({ fullName: name, updatedAt: "2026-10-10T00:00:00Z" });

    expect(ids(await list(sales, `q=${name}&sort=modifiedAt,desc`))).toEqual([recent, middle, old]);
    expect(ids(await list(sales, `q=${name}&sort=modifiedAt,asc`))).toEqual([old, middle, recent]);
  });

  it("AC-83.04 returns no rows for zzzz", async () => {
    expect(await list(sales, "q=zzzz")).toEqual({
      data: [],
      meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("AC-83.05 pages 41 applications by 20 and shows 1 row on page 3", async () => {
    const name = token();
    for (let index = 0; index < 41; index += 1) await copy({ fullName: name });

    const body = await list(sales, `q=${name}&page=3`);

    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 3, pageSize: 20, totalItems: 41, totalPages: 3 });
  });

  it("AC-83.06 shows the next step on the next poll after Dedup finishes", async () => {
    const name = token();
    const id = await copy({ fullName: name, state: "DEDUP" });
    expect((await list(sales, `q=${name}`)).data[0]?.state).toBe("DEDUP");

    await db.owner.query(
      "update application.applications set current_step = 'FRAUD', updated_at = now() where id = $1",
      [id],
    );

    expect((await list(sales, `q=${name}`)).data[0]?.state).toBe("FRAUD");
  });

  it("AC-83.07 rejects an end date before the start date", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/applications?submittedFrom=2026-10-31&submittedTo=2026-10-01",
      headers: sales.headers,
    });

    expect(res.statusCode, res.body).toBe(422);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "INVALID_DATE_RANGE",
      message: "End date must be on or after start date",
    });
  });

  it("filters Submitted Date inclusively by Jakarta business date", async () => {
    const name = token();
    const first = await copy({ fullName: name, submittedAt: "2026-10-01T00:30:00+07:00" });
    const last = await copy({ fullName: name, submittedAt: "2026-10-02T23:30:00+07:00" });
    await copy({ fullName: name, submittedAt: "2026-10-03T00:30:00+07:00" });
    await copy({ fullName: name, submittedAt: "2026-09-30T23:30:00+07:00" });

    const body = await list(sales, `q=${name}&submittedFrom=2026-10-01&submittedTo=2026-10-02&sort=submittedAt,asc`);

    expect(ids(body)).toEqual([first, last]);
  });

  it("shows drafts only to their creator and other applications within the user's branch (TN-02)", async () => {
    const name = token();
    const ownDraft = await copy({ fullName: name, status: "DRAFT", createdBy: sales.userId });
    await copy({ fullName: name, status: "DRAFT", createdBy: otherSales.userId });
    const bandung = await copy({ fullName: name, branchId: seedOrganizationIds.bandung });
    const cimahi = await copy({ fullName: name, branchId: seedOrganizationIds.cimahi });

    expect(new Set(ids(await list(sales, `q=${name}`)))).toEqual(new Set([ownDraft, bandung, cimahi]));
    expect(ids(await list(bandungViewer, `q=${name}`))).toEqual([bandung]);
  });

  it("hides applications of another company through the view (RLS)", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    const name = token();
    await copy({
      fullName: name,
      tenantId: COMPANY_002,
      productId: await insertProduct(db.owner, { tenantId: COMPANY_002 }),
      createdBy: sales.userId,
    });

    expect((await list(sales, `q=${name}`)).meta.totalItems).toBe(0);
  });
});
