import { type DocumentType, errorEnvelopeSchema, financingResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { DocumentNumbering, seedNumberFormatIds } from "../src/modules/core/document/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { DomainError } from "../src/platform/http/domain-error.js";
import {
  type ApprovalActors,
  approvalActors,
  decide,
  expectError,
  waitingApproval,
} from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const TENANT = seedCompanyIds.company001;
const APPROVE = { decision: "APPROVE", comment: "Agunan memadai" };
const EXHAUSTED = "Document number sequence for SP3K has reached its limit. Please contact your administrator";
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Pembentukan nomor dokumen dari format ACTIVE (api-specs 10 §10.6) dan nomor SP3K saat approval final (16 §16.6). */
describe("document numbering", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;

  const nextNumber = (documentType: DocumentType, branchCode: string, date: string) =>
    app
      .get(TenantTx)
      .withSystemTx(TENANT, (tx) =>
        app
          .get(DocumentNumbering)
          .nextNumber(tx, documentType, { tenantId: TENANT, branchCode, productCode: "KPR", date }, null),
      );
  const setCounter = async (formatId: string, scopeKey: string, periodKey: string, lastNumber: number) => {
    await db.owner.query(
      `insert into document.document_number_counters (id, tenant_id, format_id, scope_key, period_key, last_number)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (format_id, scope_key, period_key) do update set last_number = excluded.last_number`,
      [uuidv7(), TENANT, formatId, scopeKey, periodKey, lastNumber],
    );
  };
  const counterOf = async (formatId: string, scopeKey: string, periodKey: string) => {
    const { rows } = await db.owner.query<{ last_number: string }>(
      `select last_number from document.document_number_counters
       where format_id = $1 and scope_key = $2 and period_key = $3`,
      [formatId, scopeKey, periodKey],
    );
    return rows[0] ? Number(rows[0].last_number) : null;
  };
  const rejection = async (work: Promise<unknown>) => {
    const error = await work.then(
      () => null,
      (reason: unknown) => reason,
    );
    if (!(error instanceof DomainError)) throw new Error(`Expected a DomainError, got ${String(error)}`);
    return { code: error.code, message: error.message, status: error.status };
  };
  const financingOf = (applicationId: string) =>
    app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/financing`,
      headers: actors.inquirer.headers,
    });
  /** Pengajuan cabang Bandung (011) yang sudah disetujui level 2 dan menunggu level 1 final. */
  const atFinalLevel = async (productCategory: "COLLATERAL" | "NON_COLLATERAL") => {
    const waiting = await waitingApproval(app, db.owner, actors, "600000000.00", { productCategory });
    expect((await decide(app, actors.branchHead, waiting.applicationId, APPROVE)).statusCode).toBe(200);
    return waiting.applicationId;
  };
  const currentPeriod = () => {
    const [year = "", month = ""] = businessDate(new Date()).split("-");
    return { periodKey: `${year}${month}`, roman: ROMAN_MONTHS[Number(month) - 1], year };
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    actors = await approvalActors(db.owner);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-102.02 continues the branch 011 October sequence after 0012", async () => {
    await setCounter(seedNumberFormatIds.sp3k, "011", "202610", 12);

    expect(await nextNumber("SP3K", "011", "2026-10-21")).toBe("0013/SP3K/011/X/2026");
    expect(await counterOf(seedNumberFormatIds.sp3k, "011", "202610")).toBe(13);
  });

  it("AC-102.03 restarts the monthly sequence at 0001 in November", async () => {
    await setCounter(seedNumberFormatIds.sp3k, "011", "202610", 13);

    expect(await nextNumber("SP3K", "011", "2026-11-01")).toBe("0001/SP3K/011/XI/2026");
  });

  it("AC-102.06 stops at 9999 without changing the counter", async () => {
    await setCounter(seedNumberFormatIds.sp3k, "012", "202610", 9999);

    expect(await rejection(nextNumber("SP3K", "012", "2026-10-21"))).toEqual({
      code: "DOCUMENT_NUMBER_EXHAUSTED",
      message: EXHAUSTED,
      status: 422,
    });
    expect(await counterOf(seedNumberFormatIds.sp3k, "012", "202610")).toBe(9999);
  });

  it("AC-102.07 gives two simultaneous contracts different consecutive numbers", async () => {
    await setCounter(seedNumberFormatIds.contract, "011", "2026", 41);

    const numbers = await Promise.all([
      nextNumber("CONTRACT", "011", "2026-10-21"),
      nextNumber("CONTRACT", "011", "2026-10-21"),
    ]);

    expect(numbers.sort()).toEqual(["011/PK/2026/000042", "011/PK/2026/000043"]);
  });

  it("AC-102.08 numbers the first 2026 contract of branch 011 as 011/PK/2026/000001", async () => {
    await db.owner.query(
      "delete from document.document_number_counters where format_id = $1 and scope_key = '011' and period_key = '2026'",
      [seedNumberFormatIds.contract],
    );

    expect(await nextNumber("CONTRACT", "011", "2026-10-21")).toBe("011/PK/2026/000001");
  });

  it("refuses to number a document type without an active format", async () => {
    const attempt = app.get(TenantTx).withSystemTx(TENANT, async (tx) => {
      await tx.execute(
        `update document.document_number_formats set status = 'SUPERSEDED' where id = '${seedNumberFormatIds.sp3k}'`,
      );
      return app
        .get(DocumentNumbering)
        .nextNumber(tx, "SP3K", { tenantId: TENANT, branchCode: "011", productCode: "KPR", date: "2026-10-21" }, null);
    });

    expect(await rejection(attempt)).toEqual({
      code: "DOCUMENT_NUMBER_FORMAT_NOT_SET",
      message: "Document number format for SP3K is not set. Please contact your administrator",
      status: 422,
    });
  });

  it("AC-102.02 gives a collateral (KPR) application of branch 011 its SP3K number at final approval", async () => {
    const applicationId = await atFinalLevel("COLLATERAL");
    const { periodKey, roman, year } = currentPeriod();
    await setCounter(seedNumberFormatIds.sp3k, "011", periodKey, 12);

    expect((await decide(app, actors.regionalHead, applicationId, APPROVE)).statusCode).toBe(200);

    const res = await financingOf(applicationId);
    expect(res.statusCode, res.body).toBe(200);
    expect(financingResponseSchema.parse(res.json()).data.sp3kNumber).toBe(`0013/SP3K/011/${roman}/${year}`);
  });

  it("gives a non-collateral application no SP3K number", async () => {
    const applicationId = await atFinalLevel("NON_COLLATERAL");

    expect((await decide(app, actors.regionalHead, applicationId, APPROVE)).statusCode).toBe(200);

    expect(financingResponseSchema.parse((await financingOf(applicationId)).json()).data.sp3kNumber).toBeNull();
  });

  it("AC-102.06 refuses the final approval and forms no SP3K once the sequence reached 9999", async () => {
    const applicationId = await atFinalLevel("COLLATERAL");
    await setCounter(seedNumberFormatIds.sp3k, "011", currentPeriod().periodKey, 9999);

    expectError(
      await decide(app, actors.regionalHead, applicationId, APPROVE),
      422,
      "DOCUMENT_NUMBER_EXHAUSTED",
      EXHAUSTED,
    );

    const res = await financingOf(applicationId);
    expect(res.statusCode).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json()).message).toBe("Financing is not available yet");
  });
});
