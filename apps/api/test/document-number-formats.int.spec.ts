import {
  documentNumberFormatAcceptedSchema,
  documentNumberFormatListResponseSchema,
  documentNumberPreviewResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { NumberFormatActivation } from "../src/modules/core/document/application/number-format-activation.js";
import { seedNumberFormatIds } from "../src/modules/core/document/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { expectError } from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

const SP3K_DEFAULT = "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}";
const CONTRACT_DEFAULT = "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}";
const AC_102_01_PATTERN = "SP3K-{BRANCH_CODE}-{YYYY}{MM}-{SEQ:5}";
const INVALID_SEQUENCE = "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9";
const HOUR_MS = 60 * 60 * 1000;

/** Format nomor dokumen lewat checker-maker (api-specs 10 §10.3 s.d. §10.5, US-102). */
describe("document number formats", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let checker: TestSession;

  type Method = "GET" | "POST" | "PUT";
  const send = (session: TestSession, method: Method, url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, ...(payload ? { payload } : {}) });
  const formats = async () => {
    const res = await send(checker, "GET", "/document-number-formats");
    expect(res.statusCode, res.body).toBe(200);
    return documentNumberFormatListResponseSchema.parse(res.json()).data;
  };
  const formatOf = async (documentType: "SP3K" | "CONTRACT") =>
    (await formats()).find((format) => format.documentType === documentType);
  const submit = (documentType: string, body: object) =>
    send(maker, "PUT", `/document-number-formats/${documentType}`, {
      resetPeriod: "MONTHLY",
      counterScope: "BRANCH",
      ...body,
    });
  const accepted = async (documentType: string, body: object) => {
    const res = await submit(documentType, body);
    expect(res.statusCode, res.body).toBe(202);
    return documentNumberFormatAcceptedSchema.parse(res.json());
  };
  const review = (changeRequestId: string, action: "approve" | "reject") =>
    send(checker, "POST", `/change-requests/${changeRequestId}/${action}`, {});
  const statusOf = async (id: string) => {
    const { rows } = await db.owner.query<{ status: string }>(
      "select status from document.document_number_formats where id = $1",
      [id],
    );
    return rows[0]?.status;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const makerRole = await createRole(db.owner, "Maker Numbering", [
      { menuCode: "MST-NUMBERING", view: true, update: true },
    ]);
    const checkerRole = await createRole(db.owner, "Checker Numbering", [
      { menuCode: "MST-NUMBERING", view: true, approve: true },
    ]);
    maker = await createSession(db.owner, { roleId: makerRole });
    checker = await createSession(db.owner, { roleId: checkerRole });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("lists the default SP3K and contract formats of the tenant (grooming v3 DN-10)", async () => {
    expect(await formats()).toEqual([
      expect.objectContaining({
        id: seedNumberFormatIds.contract,
        documentType: "CONTRACT",
        pattern: CONTRACT_DEFAULT,
        resetPeriod: "YEARLY",
        counterScope: "BRANCH",
        versionNumber: 1,
        status: "ACTIVE",
        hasPendingChange: false,
      }),
      expect.objectContaining({
        id: seedNumberFormatIds.sp3k,
        documentType: "SP3K",
        pattern: SP3K_DEFAULT,
        resetPeriod: "MONTHLY",
        hasPendingChange: false,
      }),
    ]);
  });

  it("AC-102.01 previews the new SP3K pattern without touching a counter", async () => {
    const res = await send(maker, "POST", "/document-number-formats/preview", {
      documentType: "SP3K",
      pattern: AC_102_01_PATTERN,
      resetPeriod: "MONTHLY",
      counterScope: "BRANCH",
    });

    expect(res.statusCode, res.body).toBe(200);
    const { preview } = documentNumberPreviewResponseSchema.parse(res.json()).data;
    expect(preview).toMatch(/^SP3K-011-\d{6}-00001$/);
    const { rows } = await db.owner.query("select 1 from document.document_number_counters");
    expect(rows).toEqual([]);
  });

  it("AC-102.01 submits the SP3K format and keeps the old one until a checker approves", async () => {
    const { data, message } = await accepted("SP3K", { pattern: AC_102_01_PATTERN });

    expect(message).toBe("Data submitted for approval");
    expect(data).toMatchObject({ entityType: "DOCUMENT_NUMBER_FORMAT", status: "WAITING_APPROVAL", versionNumber: 2 });
    expect(data.preview).toMatch(/^SP3K-011-\d{6}-00001$/);
    expect(await formatOf("SP3K")).toMatchObject({ pattern: SP3K_DEFAULT, versionNumber: 1, hasPendingChange: true });

    const approved = await review(data.changeRequestId, "approve");

    expect(approved.statusCode, approved.body).toBe(200);
    expect(await formatOf("SP3K")).toMatchObject({
      id: data.entityId,
      pattern: AC_102_01_PATTERN,
      versionNumber: 2,
      hasPendingChange: false,
    });
    expect(await statusOf(seedNumberFormatIds.sp3k)).toBe("SUPERSEDED");
  });

  it("activates an approved format only when its effective date arrives", async () => {
    const effectiveFrom = new Date(Date.now() + HOUR_MS).toISOString();
    const { data } = await accepted("SP3K", { pattern: SP3K_DEFAULT, effectiveFrom });
    expect((await review(data.changeRequestId, "approve")).statusCode).toBe(200);
    expect(await formatOf("SP3K")).toMatchObject({ pattern: AC_102_01_PATTERN, hasPendingChange: true });

    await db.owner.query(
      "update document.document_number_formats set effective_from = now() - interval '1 minute' where id = $1",
      [data.entityId],
    );
    await app.get(NumberFormatActivation).activate(seedCompanyIds.company001, data.entityId);

    expect(await formatOf("SP3K")).toMatchObject({ id: data.entityId, pattern: SP3K_DEFAULT, versionNumber: 3 });
  });

  it("refuses a second submission while one awaits approval and returns a rejected version to Draft", async () => {
    const { data } = await accepted("CONTRACT", { pattern: "PK/{BRANCH_CODE}/{YYYY}/{SEQ:6}" });

    expectError(
      await submit("CONTRACT", { pattern: "PK-{SEQ:6}" }),
      409,
      "PENDING_CHANGE_REQUEST",
      "This data has a pending submission and cannot be edited",
    );

    expect((await review(data.changeRequestId, "reject")).statusCode).toBe(200);
    expect(await statusOf(data.entityId)).toBe("DRAFT");
    expect(await formatOf("CONTRACT")).toMatchObject({ pattern: CONTRACT_DEFAULT, hasPendingChange: false });
  });

  it("AC-102.04 rejects a pattern without a sequence token on submit and preview", async () => {
    const body = { pattern: "SP3K/{BRANCH_CODE}/{YYYY}" };

    expectError(await submit("SP3K", body), 422, "INVALID_SEQUENCE_TOKEN", INVALID_SEQUENCE);
    expectError(
      await send(maker, "POST", "/document-number-formats/preview", {
        ...body,
        documentType: "SP3K",
        resetPeriod: "MONTHLY",
        counterScope: "BRANCH",
      }),
      422,
      "INVALID_SEQUENCE_TOKEN",
      INVALID_SEQUENCE,
    );
  });

  it("AC-102.05 rejects an unknown token on submit and preview", async () => {
    const body = { pattern: "{SEQ:4}/SP3K/{BRANCH_NAME}" };

    expectError(await submit("SP3K", body), 422, "UNKNOWN_TOKEN", "Unknown token: BRANCH_NAME");
    expectError(
      await send(maker, "POST", "/document-number-formats/preview", {
        ...body,
        documentType: "SP3K",
        resetPeriod: "MONTHLY",
        counterScope: "BRANCH",
      }),
      422,
      "UNKNOWN_TOKEN",
      "Unknown token: BRANCH_NAME",
    );
  });

  it("answers an unknown document type with Not Found", async () => {
    expectError(await submit("INVOICE", { pattern: "{SEQ:4}" }), 404, "NOT_FOUND", "Data not found");
  });

  it("refuses a submission from a user without Update on Document Number Format", async () => {
    expectError(
      await send(checker, "PUT", "/document-number-formats/SP3K", {
        pattern: SP3K_DEFAULT,
        resetPeriod: "MONTHLY",
        counterScope: "BRANCH",
      }),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
  });
});
