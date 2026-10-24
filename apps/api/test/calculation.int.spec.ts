import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Decimal } from "decimal.js";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { CalculationApi, type InstallmentTerms } from "../src/modules/core/calculation/index.js";
import { seedSystemParameterIds } from "../src/modules/core/masterdata/seed/system-parameters.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const TENANT = seedCompanyIds.company001;

const terms = (overrides: Partial<InstallmentTerms> = {}): InstallmentTerms => ({
  interestType: "EFFECTIVE",
  principal: new Decimal("100000000"),
  tenor: 12,
  interestRate: new Decimal("12"),
  firstInstallmentDate: new Date("2027-01-31T00:00:00Z"),
  ...overrides,
});

interface LogRow {
  formula_code: string;
  formula_version_id: string | null;
  input_values: unknown;
  result: string | null;
  status: string;
  error_message: string | null;
}

/** Layanan perhitungan angsuran dan log eksekusi rumus (technical-specs 05 §5.16, FM-08). */
describe("CalculationApi", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let api: CalculationApi;

  const logsOf = async (applicationId: string): Promise<LogRow[]> => {
    const { rows } = await db.owner.query<LogRow>(
      `select formula_code, formula_version_id, input_values, result, status, error_message
         from calculation.formula_execution_logs where application_id = $1 order by id`,
      [applicationId],
    );
    return rows;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    api = app.get(CalculationApi);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-51.01 builds the effective schedule with the default formulas and logs each execution", async () => {
    const applicationId = uuidv7();

    const result = await api.schedule({ tenantId: TENANT, applicationId }, terms());

    expect(result.monthlyInstallment.toString()).toBe("8884879");
    expect(result.rows.at(-1)?.outstandingAmount.toString()).toBe("0");
    expect(result.formulaVersions).toEqual({ INSTALLMENT_EFFECTIVE: "DEFAULT", INSTALLMENT_DUE_DATE: "DEFAULT" });
    const logs = await logsOf(applicationId);
    expect(logs).toHaveLength(13);
    expect(logs[0]).toEqual({
      formula_code: "INSTALLMENT_EFFECTIVE",
      formula_version_id: null,
      input_values: { loanAmount: "100000000", tenor: "12", interestRate: "12" },
      result: "8884879",
      status: "SUCCESS",
      error_message: null,
    });
  });

  it("dates installments at the month end by default (RM-19)", async () => {
    const result = await api.schedule({ tenantId: TENANT }, terms({ tenor: 2 }));

    expect(result.rows[1]?.dueDate.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("moves missing days to the first of the next month when the tenant sets DUE_DATE_END_OF_MONTH (RM-19)", async () => {
    await db.owner.query(
      `insert into masterdata.system_parameter_values (id, tenant_id, definition_id, value, version_number, status,
         effective_from)
       values ($1, $2, $3, 'NEXT_MONTH_FIRST_DAY', 1, 'ACTIVE', now() - interval '1 minute')`,
      [uuidv7(), TENANT, seedSystemParameterIds.dueDateEndOfMonth],
    );
    try {
      const result = await api.schedule({ tenantId: TENANT }, terms({ tenor: 2 }));

      expect(result.rows[1]?.dueDate.toISOString().slice(0, 10)).toBe("2027-03-01");
    } finally {
      await db.owner.query("delete from masterdata.system_parameter_values where definition_id = $1", [
        seedSystemParameterIds.dueDateEndOfMonth,
      ]);
    }
  });

  it("throws FORMULA_ERROR and keeps the error log when a formula fails (FM-09)", async () => {
    const applicationId = uuidv7();

    await expect(
      api.evaluate({ tenantId: TENANT, applicationId }, "DBR_RATIO", {
        monthlyInstallment: new Decimal("2000000"),
        monthlyIncomeAllowance: new Decimal("0"),
      }),
    ).rejects.toMatchObject({ code: "FORMULA_ERROR", status: 422, message: "Division by zero" });
    expect(await logsOf(applicationId)).toEqual([
      expect.objectContaining({ formula_code: "DBR_RATIO", status: "ERROR", error_message: "Division by zero" }),
    ]);
  });
});
