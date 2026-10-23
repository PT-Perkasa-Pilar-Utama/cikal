import { applicationSubmitResponseSchema, errorEnvelopeSchema, type StepCode, type StepResult } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.factory.js";
import { TASK_QUEUE_PORT, type TaskQueuePort } from "../src/platform/http/task-queue-port.js";
import {
  attachDocument,
  emergencyContactBody,
  insertChecklist,
  occupationBody,
  personalBody,
  SEVEN_MANDATORY_DOCUMENTS,
  sectionClient,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  applicationState,
  drainProcessJobs,
  insertRoute,
  registerStepHandlers,
  type ScriptedStepHandler,
} from "./support/process.js";
import { insertProduct, nextProductCode } from "./support/product.js";
import { expectError, MANDATORY_STEPS } from "./support/route.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const SEVEN = SEVEN_MANDATORY_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true }));
/** Langkah pertama menunggu data luar agar langkah saat ini bisa diperiksa. */
const WAITING: StepResult = {
  type: "WAIT_EXTERNAL",
  externalReference: "REF-SUBMIT",
  waitDeadline: new Date("2099-01-01T00:00:00Z"),
  summary: "Waiting",
};

/** Submit pengajuan (api-specs 12 §12.8; AC-50.01 s.d. AC-50.04, AC-50.07, AC-25.05). */
describe("application submit", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let otherSales: TestSession;
  let client: ReturnType<typeof sectionClient>;
  let handlers: Map<StepCode, ScriptedStepHandler>;
  const pauseAt = (code: StepCode, applicationId: string) => handlers.get(code)?.script(applicationId, WAITING);

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    handlers = registerStepHandlers(app, ["DEDUP", "CREDIT_BUREAU", "APPROVAL"]);
    // Antrean tugas diuji di kartu Task Queue; uji ini hanya menjalankan langkah otomatis.
    vi.spyOn(app.get<TaskQueuePort>(TASK_QUEUE_PORT), "create").mockResolvedValue();
    const role = await createRole(db.owner, "Sales Submit", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: role });
    otherSales = await createSession(db.owner, { roleId: role });
    client = sectionClient(app);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  /** Produk KTA dengan rute `steps` dan checklist tujuh dokumen wajib untuk Karyawan Swasta, Belum Kawin. */
  const product = async (steps: Record<string, boolean> = { ...MANDATORY_STEPS, DEDUP: true }) => {
    const productId = await insertProduct(db.owner, { productCode: nextProductCode("U") });
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps }]);
    await insertChecklist(db.owner, productId, SEVEN);
    return productId;
  };
  /** Draft dengan semua section lengkap dan `documents` dokumen wajib terunggah. */
  const completeDraft = async (productId: string, documents = SEVEN_MANDATORY_DOCUMENTS) => {
    const id = await client.createDraft(sales, productId);
    await client.save(sales, id, "personal", personalBody());
    await client.save(sales, id, "occupation", occupationBody);
    await client.save(sales, id, "emergency-contact", emergencyContactBody);
    for (const documentType of documents) await attachDocument(db.owner, id, documentType);
    return id;
  };
  const submit = (session: TestSession, id: string, key: string | null = uuidv7()) =>
    app.inject({
      method: "POST",
      url: `/api/v1/applications/${id}/submit`,
      headers: { ...session.headers, ...(key ? { "idempotency-key": key } : {}) },
    });
  const processCount = async (id: string) =>
    (
      await db.owner.query<{ total: number }>(
        "select count(*)::int as total from orchestrator.process_instances where application_id = $1",
        [id],
      )
    ).rows[0]?.total;

  it("AC-50.01 submits a complete KTA application, starts at Dedup, and locks the data", async () => {
    const id = await completeDraft(await product());
    pauseAt("DEDUP", id);

    const res = await submit(sales, id);

    expect(res.statusCode, res.body).toBe(200);
    const body = applicationSubmitResponseSchema.parse(res.json());
    expect(body).toEqual({
      data: { id, loanId: expect.any(String), status: "ON_PROGRESS", processInstanceId: expect.any(String) },
      message: `Application submitted. Loan ID: ${body.data.loanId}`,
    });
    await drainProcessJobs(app, db.owner);
    expect(await applicationState(db.owner, id)).toMatchObject({ status: "ON_PROGRESS", current_step: "DEDUP" });
    expectError(
      await client.put(sales, id, "personal", personalBody()),
      409,
      "INVALID_STATE",
      "This action is not allowed in the current status",
    );
    const { rows } = await db.owner.query(
      "select event_type, payload from platform.outbox_events where aggregate_id = $1 order by id",
      [id],
    );
    expect(rows[0]).toEqual({
      event_type: "ApplicationSubmitted",
      payload: { applicationId: id, loanId: body.data.loanId },
    });
    expect(rows.slice(1)).toContainEqual({
      event_type: "StepSkipped",
      payload: expect.objectContaining({ applicationId: id, stepCode: "SURVEY", skipReason: expect.any(String) }),
    });
  });

  it("AC-50.02 rejects a submit with 5 of 7 mandatory documents (DOCUMENTS_INCOMPLETE)", async () => {
    const id = await completeDraft(await product(), SEVEN_MANDATORY_DOCUMENTS.slice(0, 5));

    const res = await submit(sales, id);

    expectError(res, 422, "DOCUMENTS_INCOMPLETE", "Please upload all required documents (5 of 7 required)");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      expect.objectContaining({ field: "documents", section: "documents" }),
    ]);
    expect(await processCount(id)).toBe(0);
  });

  it("AC-50.03 marks the Personal step when Education is empty (INCOMPLETE_APPLICATION)", async () => {
    const id = await completeDraft(await product());
    await db.owner.query("update application.application_personals set education = null where application_id = $1", [
      id,
    ]);

    const res = await submit(sales, id);

    expectError(res, 422, "INCOMPLETE_APPLICATION", "Please complete all required fields");
    expect(errorEnvelopeSchema.parse(res.json()).details).toEqual([
      { field: "education", code: "REQUIRED", message: "This field is required", section: "personal" },
    ]);
    expect((await applicationState(db.owner, id))?.status).toBe("DRAFT");
  });

  it("marks every step that was never saved", async () => {
    const productId = await product();
    const id = await client.createDraft(sales, productId);

    const res = await submit(sales, id);

    expect(res.statusCode).toBe(422);
    const sections = new Set(errorEnvelopeSchema.parse(res.json()).details.map((detail) => detail.section));
    expect(sections).toEqual(new Set(["personal", "occupation", "emergency-contact"]));
  });

  it("AC-50.04 starts at the first step of the product route", async () => {
    // Survey tidak berlisensi di paket POC, jadi rute tanpa Dedup dimulai dari Credit Bureau.
    const id = await completeDraft(await product({ ...MANDATORY_STEPS, CREDIT_BUREAU: true }));
    pauseAt("CREDIT_BUREAU", id);

    expect((await submit(sales, id)).statusCode).toBe(200);
    await drainProcessJobs(app, db.owner);

    expect((await applicationState(db.owner, id))?.current_step).toBe("CREDIT_BUREAU");
  });

  it("AC-50.07 runs one process for a double click with the same Idempotency-Key", async () => {
    const id = await completeDraft(await product());
    const key = uuidv7();

    const [first, second] = await Promise.all([submit(sales, id, key), submit(sales, id, key)]);
    const replay = await submit(sales, id, key);

    const ok = [first, second, replay].filter((res) => res.statusCode === 200);
    expect(ok.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ok.map((res) => res.body)).size).toBe(1);
    expect(await processCount(id)).toBe(1);
    const { rows } = await db.owner.query(
      `select count(*)::int as total from orchestrator.step_executions s
         join orchestrator.process_instances p on p.id = s.process_instance_id
        where p.application_id = $1 and s.step_code = 'DATA_ENTRY'`,
      [id],
    );
    expect(rows[0]?.total).toBe(1);
  });

  it("rejects a second submit with another Idempotency-Key (ALREADY_SUBMITTED)", async () => {
    const id = await completeDraft(await product());
    expect((await submit(sales, id)).statusCode).toBe(200);

    expectError(await submit(sales, id), 409, "ALREADY_SUBMITTED", "This application has already been submitted");
  });

  it("AC-25.05 blocks a submit without a matching checklist (CHECKLIST_NOT_CONFIGURED)", async () => {
    const productId = await insertProduct(db.owner, { productCode: nextProductCode("U") });
    await insertRoute(db.owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: MANDATORY_STEPS }]);
    const id = await completeDraft(productId, []);

    expectError(
      await submit(sales, id),
      422,
      "CHECKLIST_NOT_CONFIGURED",
      "No document checklist is configured for this product. Please contact your administrator",
    );
  });

  it("rejects a product that lost its ACTIVE route (PRODUCT_NOT_AVAILABLE)", async () => {
    const productId = await product();
    const id = await completeDraft(productId);
    await db.owner.query(
      `update product.product_route_versions set status = 'SUPERSEDED'
        where route_id in (select id from product.product_routes where product_id = $1)`,
      [productId],
    );

    expectError(await submit(sales, id), 422, "PRODUCT_NOT_AVAILABLE", "Selected product is not available");
  });

  it("requires an Idempotency-Key (IDEMPOTENCY_KEY_REQUIRED)", async () => {
    const id = await completeDraft(await product());

    expectError(await submit(sales, id, null), 400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required");
  });

  it("AC-49.06 hides my draft from another Sales (NOT_FOUND)", async () => {
    const id = await completeDraft(await product());

    expectError(await submit(otherSales, id), 404, "NOT_FOUND", "Data not found");
  });
});
