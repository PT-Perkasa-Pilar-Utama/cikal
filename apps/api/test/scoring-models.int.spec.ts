import {
  changeRequestAcceptedSchema,
  criterionResponseSchema,
  errorEnvelopeSchema,
  scoringModelDetailResponseSchema,
  scoringModelListResponseSchema,
  standardErrors,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedScoringModelIds } from "../src/modules/addons/m09-scoring/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { insertProduct, nextProductCode } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

type Response = { statusCode: number; json(): unknown };

const OCCUPATION = { fieldCode: "OCCUPATION", operator: "IN", criterionType: "WEIGHTED", weight: "50" };

/** Editor model scoring dan RAC lewat checker-maker (api-specs 22 §22.1 s.d. §22.4, US-37). */
describe("scoring model editor", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;
  let productId: string;

  const send = (session: TestSession, method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const draft = async (modelGroup: "SCORING" | "RAC" = "SCORING") => {
    const res = await send(maker, "POST", "/scoring-models", {
      modelCode: nextProductCode("M"),
      modelName: "Model Uji",
      modelGroup,
      constant: "200",
      cutOff: modelGroup === "SCORING" ? "430" : null,
      productIds: [productId],
    });
    expect(res.statusCode, res.body).toBe(201);
    return scoringModelDetailResponseSchema.parse(res.json()).data;
  };
  const addCriterion = (modelId: string, criterion: object) =>
    send(maker, "POST", `/scoring-models/${modelId}/criteria`, criterion);
  const modelStatus = async (id: string) => {
    const res = await send(maker, "GET", `/scoring-models/${id}`);
    return scoringModelDetailResponseSchema.parse(res.json()).data.status;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    checker = await createSession(db.owner, { roleId: seedRoleIds.checker });
    productId = await insertProduct(db.owner);
    // Pilihan Occupation contoh AC-37.01.
    for (const [paramId, paramValue] of [
      ["101", "ASN"],
      ["102", "Karyawan BUMN"],
    ]) {
      await db.owner.query(
        `insert into masterdata.general_parameters (id, tenant_id, param_type, param_id, param_value)
         values ($1, $2, 'Occupation', $3, $4)`,
        [uuidv7(), seedCompanyIds.company001, paramId, paramValue],
      );
    }
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  describe("criteria", () => {
    it("AC-37.01 shows the weighted criterion Occupation is one of ASN, Karyawan BUMN : +50", async () => {
      const model = await draft();

      const res = await addCriterion(model.id, { ...OCCUPATION, value: { type: "LITERAL", values: ["101", "102"] } });

      expect(res.statusCode, res.body).toBe(201);
      expect(criterionResponseSchema.parse(res.json()).data).toMatchObject({
        weight: "50.00",
        displayText: "Occupation is one of ASN, Karyawan BUMN : +50",
      });
      const detail = scoringModelDetailResponseSchema.parse(
        (await send(maker, "GET", `/scoring-models/${model.id}`)).json(),
      );
      expect(detail.data.criteria.map((criterion) => criterion.displayText)).toEqual([
        "Occupation is one of ASN, Karyawan BUMN : +50",
      ]);
    });

    it("AC-37.02 shows the mandatory RAC criterion Installment to Income Ratio <= Product DBR Max", async () => {
      const model = await draft("RAC");

      const res = await addCriterion(model.id, {
        fieldCode: "INSTALLMENT_TO_INCOME_RATIO",
        operator: "LE",
        value: { type: "VARIABLE", variableCode: "PRODUCT_DBR_MAX" },
        criterionType: "MANDATORY",
      });

      expect(res.statusCode).toBe(201);
      expect(criterionResponseSchema.parse(res.json()).data).toMatchObject({
        weight: null,
        criterionType: "MANDATORY",
        displayText: "Installment to Income Ratio <= Product DBR Max",
      });
    });

    it("AC-37.03 rejects a text value for Monthly Income (INVALID_CRITERION_VALUE)", async () => {
      const model = await draft();

      const res = await addCriterion(model.id, {
        fieldCode: "MONTHLY_INCOME",
        operator: "GT",
        value: { type: "LITERAL", value: "lima juta" },
        criterionType: "WEIGHTED",
        weight: "10",
      });

      expectError(res, 422, "INVALID_CRITERION_VALUE", "Value must be a number");
    });

    it("AC-37.04 rejects a weight of 1001 (WEIGHT_OUT_OF_RANGE)", async () => {
      const model = await draft();

      const res = await addCriterion(model.id, {
        ...OCCUPATION,
        value: { type: "LITERAL", values: ["101"] },
        weight: "1001",
      });

      expectError(res, 422, "WEIGHT_OUT_OF_RANGE", "Weight must be between -1000 and 1000");
    });

    it("rejects a field outside the catalog (UNKNOWN_VARIABLE)", async () => {
      const model = await draft();

      const res = await addCriterion(model.id, {
        fieldCode: "ID_CARD_NUMBER",
        operator: "EQ",
        value: { type: "LITERAL", value: "1" },
        criterionType: "MANDATORY",
      });

      expectError(res, 422, "UNKNOWN_VARIABLE", "Unknown field: ID_CARD_NUMBER");
    });

    it("updates and deletes a draft criterion", async () => {
      const model = await draft();
      const added = criterionResponseSchema.parse(
        (await addCriterion(model.id, { ...OCCUPATION, value: { type: "LITERAL", values: ["101"] } })).json(),
      ).data;
      const url = `/scoring-models/${model.id}/criteria/${added.id}`;

      const updated = await send(maker, "PUT", url, {
        ...OCCUPATION,
        value: { type: "LITERAL", values: ["102"] },
        weight: "-20",
      });

      expect(criterionResponseSchema.parse(updated.json()).data.displayText).toBe(
        "Occupation is one of Karyawan BUMN : -20",
      );
      expect((await send(maker, "DELETE", url)).statusCode).toBe(204);
      expectError(await send(maker, "DELETE", url), 404, "NOT_FOUND", standardErrors.NOT_FOUND.message);
    });
  });

  describe("models", () => {
    it("creates version 1 as Draft and rejects a duplicate model code (MODEL_CODE_EXISTS)", async () => {
      const model = await draft();

      expect(model).toMatchObject({ versionNumber: 1, status: "DRAFT", constant: "200.00", productIds: [productId] });
      const again = await send(maker, "POST", "/scoring-models", {
        modelCode: model.modelCode,
        modelName: "Lain",
        modelGroup: "SCORING",
        productIds: [],
      });
      expectError(again, 409, "MODEL_CODE_EXISTS", "This model code already exists");
    });

    it("AC-37.05 submits a new version for approval and keeps the active version until it is approved", async () => {
      const created = await send(maker, "POST", `/scoring-models/${seedScoringModelIds.ktaScoring}/new-version`);
      expect(created.statusCode, created.body).toBe(201);
      const next = scoringModelDetailResponseSchema.parse(created.json()).data;
      expect(next).toMatchObject({ modelCode: "KTA-2026", versionNumber: 2, status: "DRAFT" });
      expect(next.criteria).toHaveLength(4);

      const res = await send(maker, "POST", `/scoring-models/${next.id}/submit`, {});

      expect(res.statusCode).toBe(202);
      const accepted = changeRequestAcceptedSchema.parse(res.json());
      expect(accepted.message).toBe("Data submitted for approval");
      expect(await modelStatus(next.id)).toBe("WAITING_APPROVAL");
      expect(await modelStatus(seedScoringModelIds.ktaScoring)).toBe("ACTIVE");
      expectError(
        await send(maker, "POST", `/scoring-models/${seedScoringModelIds.ktaScoring}/new-version`),
        409,
        "PENDING_CHANGE_REQUEST",
        standardErrors.PENDING_CHANGE_REQUEST.message,
      );

      const approved = await send(checker, "POST", `/change-requests/${accepted.data.changeRequestId}/approve`, {});

      expect(approved.statusCode).toBe(200);
      expect(await modelStatus(next.id)).toBe("ACTIVE");
      expect(await modelStatus(seedScoringModelIds.ktaScoring)).toBe("SUPERSEDED");
    });

    it("returns a rejected version to Draft", async () => {
      const model = await draft();
      await addCriterion(model.id, { ...OCCUPATION, value: { type: "LITERAL", values: ["101"] } });
      const accepted = changeRequestAcceptedSchema.parse(
        (await send(maker, "POST", `/scoring-models/${model.id}/submit`, {})).json(),
      );

      const res = await send(checker, "POST", `/change-requests/${accepted.data.changeRequestId}/reject`, {});

      expect(res.statusCode).toBe(200);
      expect(await modelStatus(model.id)).toBe("DRAFT");
    });

    it("rejects submitting a model without criteria (MODEL_WITHOUT_CRITERIA)", async () => {
      const model = await draft();

      expectError(
        await send(maker, "POST", `/scoring-models/${model.id}/submit`, {}),
        422,
        "MODEL_WITHOUT_CRITERIA",
        "Add at least one criterion",
      );
    });

    it("rejects editing a version that is not Draft (INVALID_STATE)", async () => {
      const res = await addCriterion(seedScoringModelIds.ktaRac, {
        ...OCCUPATION,
        value: { type: "LITERAL", values: ["101"] },
      });

      expectError(res, 409, "INVALID_STATE", standardErrors.INVALID_STATE.message);
    });

    it("lists models by group and status", async () => {
      const model = await draft("RAC");

      const res = await send(maker, "GET", `/scoring-models?modelGroup=RAC&status=DRAFT&productId=${productId}`);

      const list = scoringModelListResponseSchema.parse(res.json());
      expect(list.data.map((row) => row.id)).toContain(model.id);
      expect(list.data.every((row) => row.modelGroup === "RAC" && row.status === "DRAFT")).toBe(true);
      expect(list.data.find((row) => row.id === model.id)?.products).toEqual([
        { id: productId, productCode: expect.any(String) },
      ]);
    });

    it("rejects an unknown model (NOT_FOUND)", async () => {
      expectError(
        await send(maker, "GET", `/scoring-models/${uuidv7()}`),
        404,
        "NOT_FOUND",
        standardErrors.NOT_FOUND.message,
      );
    });
  });
});
