import { errorEnvelopeSchema, scoringModelTestResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Decimal } from "decimal.js";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedScoringModelIds } from "../src/modules/addons/m09-scoring/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { occupationBody, personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertRoute } from "./support/process.js";
import { insertProduct, insertSubProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

/** Plafon 200 juta, tenor 36, bunga efektif 12% p.a.: angsuran 6.642.862 dari penghasilan 8 juta (AC-67.02). */
const LARGE_LOAN = { requestedLimit: "200000000.00", tenorProposed: 36 };
const NPWP = "123456789012345";

/** Uji model scoring dengan pengajuan contoh (api-specs 22 §22.5, US-38). */
describe("scoring model test", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let sampleLoanId: string;
  let sampleId: string;

  const runTest = (modelId: string, loanId: string) =>
    app.inject({
      method: "POST",
      url: `/api/v1/scoring-models/${modelId}/test`,
      headers: maker.headers,
      payload: { sampleLoanId: loanId },
    });
  const resultOf = async (modelId: string) => {
    const res = await runTest(modelId, sampleLoanId);
    expect(res.statusCode, res.body).toBe(200);
    return scoringModelTestResponseSchema.parse(res.json()).data;
  };
  /** Model draft Constant 200, Cut Off 430, satu kriteria pekerjaan sampel dengan bobot `weight`. */
  const draftModel = async (weight: string) => {
    const id = uuidv7();
    await db.owner.query(
      `insert into m09_scoring.scoring_models (id, tenant_id, model_code, model_name, model_group, constant, cut_off,
         version_number, status)
       values ($1, $2, $3, 'Scoring Uji', 'SCORING', 200, 430, 1, 'DRAFT')`,
      [id, seedCompanyIds.company001, `TEST-${id.slice(-6)}`],
    );
    await db.owner.query(
      `insert into m09_scoring.scoring_criteria (id, tenant_id, model_id, sort_order, field_code, operator, value,
         weight, criterion_type)
       values ($1, $2, $3, 1, 'OCCUPATION', 'IN', $4, $5, 'WEIGHTED')`,
      [
        uuidv7(),
        seedCompanyIds.company001,
        id,
        JSON.stringify({ type: "LITERAL", values: [occupationBody.occupation] }),
        weight,
      ],
    );
    return id;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const makerRole = await createRole(db.owner, "Maker Scoring Test", [
      { menuCode: "MST-SCORING", view: true, update: true },
    ]);
    maker = await createSession(db.owner, { roleId: makerRole });
    const salesRole = await createRole(db.owner, "Sales Scoring Test", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    const sales = await createSession(db.owner, { roleId: salesRole });
    const productId = await insertProduct(db.owner);
    await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, APPROVAL: true } },
    ]);
    await insertSubProduct(db.owner, productId, { interestRate: "12.0000", validFrom: "2026-01-01" });
    const client = sectionClient(app);
    sampleId = await client.createDraft(sales, productId, LARGE_LOAN);
    await client.save(sales, sampleId, "personal", personalBody({ npwpNumber: NPWP }));
    await client.save(sales, sampleId, "occupation", occupationBody);
    const { rows } = await db.owner.query<{ loan_id: string }>(
      "select loan_id from application.applications where id = $1",
      [sampleId],
    );
    sampleLoanId = rows[0]?.loan_id ?? "";
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-38.01 shows the total score, constant, cut off, result, and met criteria with their weights", async () => {
    const result = await resultOf(seedScoringModelIds.ktaScoring);

    expect(result).toMatchObject({ sampleLoanId, modelGroup: "SCORING", constant: "200.00", cutOff: "430.00" });
    expect(result.criteria).toHaveLength(4);
    expect(result.criteria[0]).toMatchObject({ isMet: true, appliedWeight: "100.00" });
    const weights = result.criteria.reduce((sum, row) => sum.add(row.appliedWeight ?? 0), new Decimal(200));
    expect(result.totalScore).toBe(weights.toFixed(2));
    expect(result.result).toBe(weights.gte(430) ? "PASS" : "FAIL");
    const { rows } = await db.owner.query("select 1 from m09_scoring.scoring_results where application_id = $1", [
      sampleId,
    ]);
    expect(rows).toEqual([]);
  });

  it("AC-38.02 passes a score exactly at the cut off", async () => {
    expect(await resultOf(await draftModel("230.00"))).toMatchObject({ totalScore: "430.00", result: "PASS" });
  });

  it("AC-38.03 fails a score one point under the cut off", async () => {
    expect(await resultOf(await draftModel("229.00"))).toMatchObject({ totalScore: "429.00", result: "FAIL" });
  });

  it("AC-38.04 answers an unknown sample Loan ID with Application not found", async () => {
    const res = await runTest(seedScoringModelIds.ktaScoring, "LOANTIDAKADA");

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  });

  it("tests a RAC model without a score and fails it on the installment to income ratio", async () => {
    expect(await resultOf(seedScoringModelIds.ktaRac)).toMatchObject({
      modelGroup: "RAC",
      constant: null,
      cutOff: null,
      totalScore: null,
      result: "FAIL",
      criteria: [expect.objectContaining({ isMet: false, appliedWeight: null })],
    });
  });

  it("asks for a cut off before testing a scoring draft without one (VALIDATION_FAILED)", async () => {
    const modelId = await draftModel("230.00");
    await db.owner.query("update m09_scoring.scoring_models set cut_off = null where id = $1", [modelId]);

    const res = await runTest(modelId, sampleLoanId);

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "cutOff", message: "Cut Off is required for a scoring model" }],
    });
  });

  it("answers an unknown model with Not Found", async () => {
    const res = await runTest(uuidv7(), sampleLoanId);

    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code: "NOT_FOUND", message: "Data not found" });
  });
});
