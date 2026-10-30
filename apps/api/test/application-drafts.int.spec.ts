import {
  applicationDraftListResponseSchema,
  applicationDraftResponseSchema,
  applicationFormResponseSchema,
  errorEnvelopeSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { formatLoanId } from "../src/modules/core/application/domain/loan-id.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantEncryption } from "../src/platform/crypto/tenant-encryption.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertRoute } from "./support/process.js";
import { insertProduct, nextProductCode } from "./support/product.js";
import { expectError, MANDATORY_STEPS } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const NIK = "3273011402900001";
const MINIMUM_MESSAGE =
  "Fill in Application Type, Identity Type, Identity Number, Product Category, Product, Full Name, and Full Name ID to save a draft";
const TRM_STP_001_STEPS = ["application", "personal", "occupation", "documents", "emergency-contact"];

/** Draft pengajuan web: simpan pertama, daftar milik Sales, dan lanjutkan draft (api-specs 12 §12.2, §12.4, §12.5). */
describe("application drafts", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let salesRole: string;
  let sales01: TestSession;
  let sales02: TestSession;
  let viewer: TestSession;
  let productId: string;
  let productCode: string;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    salesRole = await createRole(db.owner, "Sales Draft", [{ menuCode: "APP-ENTRY", view: true, create: true }]);
    const viewerRole = await createRole(db.owner, "Sales Lihat", [{ menuCode: "APP-ENTRY", view: true }]);
    sales01 = await createSession(db.owner, { roleId: salesRole });
    sales02 = await createSession(db.owner, { roleId: salesRole });
    viewer = await createSession(db.owner, { roleId: viewerRole });
    productCode = nextProductCode("D");
    productId = await insertProduct(db.owner, { productCode });
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: MANDATORY_STEPS }]);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const draftBody = (overrides: { application?: object; personal?: object; strict?: boolean } = {}) => ({
    application: {
      applicationType: "NTB",
      productCategory: "NON_COLLATERAL",
      productId,
      segment: "MIKRO",
      tenorProposed: 36,
      requestedLimit: "20000000.00",
      ...overrides.application,
    },
    personal: {
      idType: "KTP",
      idCardNumber: NIK,
      fullName: "Rudi Hartono",
      fullNameId: "RUDI HARTONO",
      ...overrides.personal,
    },
    ...(overrides.strict === undefined ? {} : { strict: overrides.strict }),
  });
  const post = (session: TestSession, payload: object) =>
    app.inject({ method: "POST", url: "/api/v1/applications", headers: session.headers, payload });
  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications${url}`, headers: session.headers });
  const saveDraft = async (session: TestSession, overrides: Parameters<typeof draftBody>[0] = {}) => {
    const res = await post(session, draftBody(overrides));
    expect(res.statusCode, res.body).toBe(201);
    return applicationDraftResponseSchema.parse(res.json());
  };
  const listDrafts = async (session: TestSession, query = "") => {
    const res = await get(session, `/drafts${query}`);
    expect(res.statusCode, res.body).toBe(200);
    return applicationDraftListResponseSchema.parse(res.json());
  };
  const applicationCount = async (id: string) =>
    (await db.owner.query("select count(*)::int as total from application.applications where product_id = $1", [id]))
      .rows[0]?.total;

  it("AC-49.01 saves the first draft with a Loan ID and stores the NIK encrypted with a blind index", async () => {
    const res = await saveDraft(sales01);

    const loanId = formatLoanId(new Date(), productCode, 1);
    expect(res).toEqual({
      data: {
        id: expect.any(String),
        loanId,
        status: "DRAFT",
        currentSection: "application",
        steps: TRM_STP_001_STEPS,
      },
      message: `Application saved as draft. Loan ID: ${loanId}`,
    });
    const { rows } = await db.owner.query(
      `select a.channel, a.status, a.created_by, p.id_card_number_enc, p.id_card_number_key_version, p.id_card_number_bidx
         from application.applications a join application.application_personals p on p.application_id = a.id
        where a.id = $1`,
      [res.data.id],
    );
    const stored = rows[0];
    expect(stored).toMatchObject({
      channel: "WEB",
      status: "DRAFT",
      created_by: sales01.userId,
      id_card_number_key_version: 1,
    });
    expect(stored.id_card_number_enc.includes(Buffer.from(NIK))).toBe(false);
    const bidx = await app
      .get(TenantTx)
      .withTenantTx({ tenantId: seedCompanyIds.company001, userId: sales01.userId }, (tx) =>
        app.get(TenantEncryption).blindIndex(tx, NIK),
      );
    expect(stored.id_card_number_bidx).toEqual(bidx);
  });

  it("AC-49.02 rejects a draft without the Product field", async () => {
    const res = await post(sales01, draftBody({ application: { productId: undefined } }));

    expectError(res, 422, "DRAFT_MINIMUM_FIELDS", MINIMUM_MESSAGE);
  });

  it("AC-49.02 rejects a draft with a blank Full Name", async () => {
    const res = await post(sales01, draftBody({ personal: { fullName: "  " } }));

    expectError(res, 422, "DRAFT_MINIMUM_FIELDS", MINIMUM_MESSAGE);
  });

  it("rejects an ID card number that is not 16 digits (VALIDATION_FAILED)", async () => {
    const res = await post(sales01, draftBody({ personal: { idCardNumber: "327301140290000" } }));

    expect(res.statusCode).toBe(400);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [expect.objectContaining({ message: "ID card number must be 16 digits" })],
    });
  });

  it("rejects a product without an ACTIVE route or of another category (PRODUCT_NOT_AVAILABLE)", async () => {
    const withoutRoute = await insertProduct(db.owner, { productCode: nextProductCode("N") });

    expectError(
      await post(sales01, draftBody({ application: { productId: withoutRoute } })),
      422,
      "PRODUCT_NOT_AVAILABLE",
      "Selected product is not available",
    );
    expectError(
      await post(sales01, draftBody({ application: { productCategory: "COLLATERAL" } })),
      422,
      "PRODUCT_NOT_AVAILABLE",
      "Selected product is not available",
    );
    expect(await applicationCount(withoutRoute)).toBe(0);
  });

  it("AC-49.04 TRM_LID_005 saves nothing when the Loan ID counter is exhausted (LOAN_ID_EXHAUSTED)", async () => {
    const code = nextProductCode("E");
    const exhausted = await insertProduct(db.owner, { productCode: code });
    await insertRoute(db.owner, exhausted, [{ versionNumber: 1, status: "ACTIVE", steps: MANDATORY_STEPS }]);
    await db.owner.query(
      `insert into application.loan_id_counters (id, tenant_id, product_code, last_number)
       values (gen_random_uuid(), $1, $2, 9999999)`,
      [seedCompanyIds.company001, code],
    );

    expectError(
      await post(sales01, draftBody({ application: { productId: exhausted } })),
      422,
      "LOAN_ID_EXHAUSTED",
      "Loan ID counter has reached its limit. Please contact your administrator",
    );
    expect(await applicationCount(exhausted)).toBe(0);
  });

  it("moves a draft saved with Next to the Personal step without the draft message", async () => {
    const res = await saveDraft(sales01, { strict: true });

    expect(res.data.currentSection).toBe("personal");
    expect(res.message).toBeUndefined();
  });

  it("requires Create on Data Entry to save a draft", async () => {
    expectError(
      await post(viewer, draftBody()),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
  });

  it("AC-49.05 resumes a draft at its last step with the saved data", async () => {
    const draft = await saveDraft(sales01);
    await db.owner.query("update application.applications set current_section = 'occupation' where id = $1", [
      draft.data.id,
    ]);

    const listed = (await listDrafts(sales01, `?q=${draft.data.loanId}`)).data;
    expect(listed).toEqual([
      {
        id: draft.data.id,
        loanId: draft.data.loanId,
        fullName: "Rudi Hartono",
        productCode,
        requestedLimit: "20000000.00",
        currentSection: "occupation",
        returnNote: null,
        updatedAt: expect.any(String),
      },
    ]);
    const res = await get(sales01, `/${draft.data.id}/form`);
    expect(res.statusCode, res.body).toBe(200);
    expect(applicationFormResponseSchema.parse(res.json()).data).toEqual({
      id: draft.data.id,
      loanId: draft.data.loanId,
      status: "DRAFT",
      currentSection: "occupation",
      steps: TRM_STP_001_STEPS,
      sections: {
        application: {
          applicationType: "NTB",
          productCategory: "NON_COLLATERAL",
          productId,
          segment: "MIKRO",
          purposeOfLoan: null,
          tenorProposed: 36,
          requestedLimit: "20000000.00",
          insuranceId: null,
          sourceCode: null,
          salesCode: null,
          referralCode: null,
          marketingCode: null,
        },
        personal: expect.objectContaining({
          idType: "KTP",
          idCardNumber: NIK,
          fullName: "Rudi Hartono",
          fullNameId: "RUDI HARTONO",
          dateOfBirth: null,
          addresses: { id: null, residence: null },
          consentAt: null,
        }),
        spouse: null,
        occupation: null,
        business: null,
        collateral: null,
        "emergency-contact": null,
      },
      documentCompleteness: null,
      collateralTypes: [],
      returnNote: null,
    });
  });

  it("AC-49.06 hides my draft from another Sales in the list and the form", async () => {
    const draft = await saveDraft(sales01, { personal: { fullName: "Sinta Rahayu" } });

    expect((await listDrafts(sales02, `?q=${draft.data.loanId}`)).data).toEqual([]);
    expect((await listDrafts(sales02, "?q=Sinta")).data).toEqual([]);
    expectError(await get(sales02, `/${draft.data.id}/form`), 404, "NOT_FOUND", "Data not found");
    expect((await listDrafts(sales01, "?q=sinta")).data.map((row) => row.loanId)).toEqual([draft.data.loanId]);
  });

  it("lists only drafts, newest first, with paging", async () => {
    const owner = await createSession(db.owner, { roleId: salesRole });
    const first = await saveDraft(owner);
    const second = await saveDraft(owner);
    const submitted = await saveDraft(owner);
    await db.owner.query("update application.applications set status = 'ON_PROGRESS' where id = $1", [
      submitted.data.id,
    ]);

    const page1 = await listDrafts(owner, "?pageSize=1");
    expect(page1.data.map((row) => row.id)).toEqual([second.data.id]);
    expect(page1.meta).toEqual({ page: 1, pageSize: 1, totalItems: 2, totalPages: 2 });
    const oldest = await listDrafts(owner, "?sort=updatedAt,asc");
    expect(oldest.data.map((row) => row.id)).toEqual([first.data.id, second.data.id]);
  });
});
