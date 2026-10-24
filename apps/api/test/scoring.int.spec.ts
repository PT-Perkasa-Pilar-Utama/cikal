import { applicationScoringResponseSchema, errorEnvelopeSchema, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedScoringModelIds } from "../src/modules/addons/m09-scoring/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { Licensing, seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { occupationBody, personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { installTestLicense, issueTestLicense, POC_LICENSE_MODULES } from "./support/license.js";
import { drainProcessJobs, insertRoute, latestSteps, registerStepHandlers, startProcess } from "./support/process.js";
import { insertProduct, insertSubProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const ROUTE: Partial<Record<StepCode, boolean>> = { DATA_ENTRY: true, RAC: true, SCORING: true, APPROVAL: true };
/** Plafon 200 juta, tenor 36, bunga efektif 12% p.a.: angsuran 6.642.862 (AC-67.02). */
const LARGE_LOAN = { requestedLimit: "200000000.00", tenorProposed: 36 };
/** Plafon di atas 50 juta wajib NPWP di section Personal. */
const NPWP = "123456789012345";

/** Langkah RAC dan SCORING M09 dengan model seed KTA (api-specs 22 §22.6, US-67). */
describe("rac and scoring", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let client: ReturnType<typeof sectionClient>;

  const linkModel = (modelId: string, productId: string) =>
    db.owner.query(
      "insert into m09_scoring.scoring_model_products (id, tenant_id, model_id, product_id) values ($1, $2, $3, $4)",
      [uuidv7(), seedCompanyIds.company001, modelId, productId],
    );
  /** Produk efektif 12% p.a., DBR max 40%, dengan model seed yang ditautkan. */
  const product = async (models: string[], productName?: string) => {
    const productId = await insertProduct(db.owner, productName ? { productName } : {});
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
    await insertSubProduct(db.owner, productId, { interestRate: "12.0000", validFrom: "2026-01-01" });
    for (const modelId of models) await linkModel(modelId, productId);
    return productId;
  };
  const assessed = async (
    productId: string,
    application: object = {},
    occupation: object = {},
  ): Promise<{ id: string; steps: Awaited<ReturnType<typeof latestSteps>> }> => {
    const id = await client.createDraft(sales, productId, application);
    await client.save(sales, id, "personal", personalBody({ npwpNumber: NPWP }));
    await client.save(sales, id, "occupation", { ...occupationBody, ...occupation });
    await db.owner.query(
      `update application.applications set status = 'ON_PROGRESS', submitted_at = now(), submitted_by = created_by
        where id = $1`,
      [id],
    );
    const processId = await startProcess(app, id);
    await drainProcessJobs(app, db.owner);
    return { id, steps: await latestSteps(db.owner, processId) };
  };
  const scoringOf = (applicationId: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications/${applicationId}/scoring`, headers: inquirer.headers });
  const resultOf = async (applicationId: string) => {
    const res = await scoringOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    return applicationScoringResponseSchema.parse(res.json()).data;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const role = await createRole(db.owner, "Sales Scoring", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    inquirer = await createSession(db.owner, { roleId: seedRoleIds.riskManager });
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-67.01 shows Total Score 470, Cut Off 430, Pass, and the met criteria", async () => {
    const productId = await product([seedScoringModelIds.ktaRac, seedScoringModelIds.ktaScoring]);

    const { id, steps } = await assessed(productId);

    expect(steps.get("SCORING")).toMatchObject({ status: "COMPLETED", outcome_code: "PASS" });
    expect((await resultOf(id)).scoring).toEqual({
      modelCode: "KTA-2026",
      versionNumber: 1,
      constant: "200.00",
      cutOff: "430.00",
      totalScore: "470.00",
      result: "PASS",
      criteria: [
        {
          displayText: "Occupation is one of Karyawan Swasta, Pegawai Negeri Sipil : +100",
          actualValue: "Karyawan Swasta",
          isMet: true,
          appliedWeight: "100.00",
        },
        {
          displayText: "Monthly Income >= 5000000.00 : +80",
          actualValue: "8000000.00",
          isMet: true,
          appliedWeight: "80.00",
        },
        {
          displayText: "Tenure at Current Job >= 2 : +50",
          actualValue: "4.0",
          isMet: true,
          appliedWeight: "50.00",
        },
        { displayText: "Age is between 25 and 50 : +40", actualValue: "36", isMet: true, appliedWeight: "40.00" },
      ],
    });
  });

  it("AC-67.02 fails RAC when the installment is 332% of the income against a DBR max of 40%", async () => {
    const productId = await product([seedScoringModelIds.ktaRac, seedScoringModelIds.ktaScoring]);

    const { id, steps } = await assessed(productId, LARGE_LOAN, { monthlyIncomeAllowance: "2000000.00" });

    expect(steps.get("RAC")).toMatchObject({ status: "COMPLETED", outcome_code: "FAIL" });
    expect((await resultOf(id)).rac).toEqual({
      modelCode: "KTA-RAC",
      versionNumber: 1,
      result: "FAIL",
      failedReasons: ["Installment to Income Ratio 332% exceeds DBR max 40%"],
      criteria: [
        { displayText: "Installment to Income Ratio <= Product DBR Max", actualValue: "332.1431", isMet: false },
      ],
    });
  });

  it("AC-67.03 passes RAC affordability when the installment is exactly 40% of the income", async () => {
    const productId = await product([seedScoringModelIds.ktaRac, seedScoringModelIds.ktaScoring]);

    const { id, steps } = await assessed(productId, LARGE_LOAN, { monthlyIncomeAllowance: "16607155.00" });

    expect(steps.get("RAC")).toMatchObject({ status: "COMPLETED", outcome_code: "PASS" });
    expect((await resultOf(id)).rac).toMatchObject({
      result: "PASS",
      failedReasons: [],
      criteria: [{ actualValue: "40.0000", isMet: true }],
    });
  });

  it("AC-67.04 stops Scoring at Error when the product has no active scoring model", async () => {
    const productId = await product([seedScoringModelIds.ktaRac], "KPR Subsidi");

    const { id, steps } = await assessed(productId);

    expect(steps.get("SCORING")).toMatchObject({
      status: "ERROR",
      error_category: "BUSINESS_SETUP",
      error_message: "No active scoring model for product KPR Subsidi",
    });
    expect(await resultOf(id)).toMatchObject({ rac: { result: "PASS" }, scoring: null });
  });

  it("answers both results as null before the process starts", async () => {
    const productId = await product([]);
    const id = await client.createDraft(sales, productId);

    expect(await resultOf(id)).toEqual({ rac: null, scoring: null });
  });

  it("answers NOT_FOUND for a process of another application", async () => {
    const productId = await product([seedScoringModelIds.ktaRac, seedScoringModelIds.ktaScoring]);
    const { id } = await assessed(productId);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${id}/scoring?processInstanceId=0192b6ad-9999-7000-8000-000000000001`,
      headers: inquirer.headers,
    });

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });

  it("answers APPLICATION_NOT_FOUND for an unknown application", async () => {
    const res = await scoringOf("0192b6ad-9999-7000-8000-000000000001");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("answers MODULE_NOT_LICENSED when the company has no M09 licence", async () => {
    const productId = await product([]);
    const id = await client.createDraft(sales, productId);
    await installTestLicense(db.owner, issueTestLicense({ modules: POC_LICENSE_MODULES.filter((m) => m !== "M09") }));
    app.get(Licensing).invalidate();
    try {
      const res = await scoringOf(id);

      expect(res.statusCode).toBe(403);
      expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
        code: "MODULE_NOT_LICENSED",
        message: "You do not have access to this page",
      });
    } finally {
      await installTestLicense(db.owner, issueTestLicense());
      app.get(Licensing).invalidate();
    }
  });
});
