import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { LoanIds } from "../src/modules/core/application/application/loan-ids.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { type TenantContext, TenantTx } from "../src/platform/db/tenant-tx.js";
import { DomainError } from "../src/platform/http/domain-error.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const COMPANY_007 = "0192b6f0-0007-7000-8000-000000000001";
const SALES_001 = { tenantId: seedCompanyIds.company001, userId: "0192b6f0-0001-7000-8000-000000000001" };
const SALES_007 = { tenantId: COMPANY_007, userId: "0192b6f0-0001-7000-8000-000000000007" };
/** 20-10-2026 10:00 Asia/Jakarta. */
const OCT_20 = new Date("2026-10-20T03:00:00Z");
const OCT_21 = new Date("2026-10-21T03:00:00Z");

/** Pembentuk Loan ID draft pertama (api-specs 12 §12.2 langkah 4, MRTM TRM_LID_001 s.d. 006). */
describe("loan id", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '007', 'Bank Tujuh', 'Alamat')",
      [COMPANY_007],
    );
  });

  afterEach(async () => {
    await db.owner.query("delete from application.loan_id_counters");
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const next = (actor: TenantContext, productCode: string, at = OCT_20) =>
    app.get(TenantTx).withTenantTx(actor, (tx) => app.get(LoanIds).next(tx, actor, productCode, at));
  const setCounter = (tenantId: string, productCode: string, lastNumber: number) =>
    db.owner.query(
      `insert into application.loan_id_counters (id, tenant_id, product_code, last_number)
       values (gen_random_uuid(), $1, $2, $3)`,
      [tenantId, productCode, lastNumber],
    );
  const counter = async (tenantId: string, productCode: string) =>
    (
      await db.owner.query(
        "select last_number from application.loan_id_counters where tenant_id = $1 and product_code = $2",
        [tenantId, productCode],
      )
    ).rows[0]?.last_number;

  it("AC-49.01 AC-49.04 TRM_LID_001 continues the KTA counter of the company", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 12);

    expect(await next(SALES_001, "KTA")).toBe("20102026KTA0000013");
    expect(await counter(SALES_001.tenantId, "KTA")).toBe("13");
  });

  it("AC-49.04 TRM_LID_002 keeps a separate counter per product", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 12);
    await setCounter(SALES_001.tenantId, "KPR", 40);

    expect(await next(SALES_001, "KPR")).toBe("20102026KPR0000041");
    expect(await counter(SALES_001.tenantId, "KTA")).toBe("12");
  });

  it("AC-49.04 TRM_LID_003 does not reset the counter on a new day", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 13);

    expect(await next(SALES_001, "KTA", OCT_21)).toBe("21102026KTA0000014");
  });

  it("AC-49.04 TRM_LID_004 keeps a separate counter per company, starting at 1", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 12);

    expect(await next(SALES_007, "KTA")).toBe("20102026KTA0000001");
    expect(await counter(SALES_001.tenantId, "KTA")).toBe("12");
    expect(await counter(COMPANY_007, "KTA")).toBe("1");
  });

  it("AC-49.04 TRM_LID_005 refuses a Loan ID once the counter reached 9999999", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 9_999_999);

    const error = await next(SALES_001, "KTA").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({
      code: "LOAN_ID_EXHAUSTED",
      status: 422,
      message: "Loan ID counter has reached its limit. Please contact your administrator",
    });
    expect(await counter(SALES_001.tenantId, "KTA")).toBe("9999999");
  });

  it("AC-49.04 TRM_LID_006 gives two drafts saved at the same second different, consecutive Loan IDs", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 12);
    const otherSales = { ...SALES_001, userId: "0192b6f0-0001-7000-8000-000000000002" };

    const loanIds = await Promise.all([next(SALES_001, "KTA"), next(otherSales, "KTA")]);

    expect(loanIds.sort()).toEqual(["20102026KTA0000013", "20102026KTA0000014"]);
  });

  it("AC-49.04 TRM_LID_006 hands out distinct numbers to many concurrent first drafts of a new product", async () => {
    const loanIds = await Promise.all(Array.from({ length: 4 }, () => next(SALES_001, "KUR")));

    expect(loanIds.sort()).toEqual([1, 2, 3, 4].map((n) => `20102026KUR000000${n}`));
  });

  it("AC-49.03 never issues a Loan ID twice, so a saved draft keeps the one it got first", async () => {
    const first = await next(SALES_001, "KTA");
    const later = [await next(SALES_001, "KTA"), await next(SALES_001, "KTA")];

    expect(first).toBe("20102026KTA0000001");
    expect(later).toEqual(["20102026KTA0000002", "20102026KTA0000003"]);
  });

  it("returns the number when the draft transaction rolls back", async () => {
    await setCounter(SALES_001.tenantId, "KTA", 12);
    const failedDraft = app.get(TenantTx).withTenantTx(SALES_001, async (tx) => {
      await app.get(LoanIds).next(tx, SALES_001, "KTA", OCT_20);
      throw new Error("draft insert failed");
    });

    await expect(failedDraft).rejects.toThrow("draft insert failed");
    expect(await next(SALES_001, "KTA")).toBe("20102026KTA0000013");
  });
});
