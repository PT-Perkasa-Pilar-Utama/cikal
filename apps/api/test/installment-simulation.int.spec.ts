import { errorEnvelopeSchema, installmentSimulationResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const URL = "/api/v1/calculations/installment-simulation";
const BASE = { principal: "100000000.00", tenor: 12, interestRate: "12.0000", firstInstallmentDate: "2026-11-21" };

/** `POST /calculations/installment-simulation` (api-specs 09 §9.1, US-51). */
describe("installment simulation", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let maker: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const simulate = (payload: object, session: TestSession = sales) =>
    app.inject({ method: "POST", url: URL, headers: session.headers, payload });
  const simulation = async (payload: object) => {
    const res = await simulate(payload);
    expect(res.statusCode).toBe(200);
    return installmentSimulationResponseSchema.parse(res.json()).data;
  };

  it("AC-51.01 returns the effective installment Rp8.884.879 and 12 rows ending at Rp0", async () => {
    const data = await simulation({ ...BASE, interestType: "EFFECTIVE" });

    expect(data).toMatchObject({ monthlyInstallment: "8884879.00", appliedRate: "12.0000", tenor: 12 });
    expect(data.schedule).toHaveLength(12);
    expect(data.schedule[0]).toEqual({
      installmentNo: 1,
      dueDate: "2026-11-21",
      principalAmount: "7884879.00",
      interestAmount: "1000000.00",
      installmentAmount: "8884879.00",
      outstandingAmount: "92115121.00",
    });
    expect(data.schedule[11]).toMatchObject({ dueDate: "2027-10-21", outstandingAmount: "0.00" });
    expect(data.formulaVersions).toEqual({ INSTALLMENT_EFFECTIVE: "DEFAULT", INSTALLMENT_DUE_DATE: "DEFAULT" });
  });

  it("AC-51.04 returns Rp1.000.000 a month without interest at a 0% flat rate", async () => {
    const data = await simulation({ ...BASE, interestType: "FLAT", principal: "12000000.00", interestRate: "0.0000" });

    expect(new Set(data.schedule.map((row) => row.installmentAmount))).toEqual(new Set(["1000000.00"]));
    expect(data.totalInterest).toBe("0.00");
  });

  it("dates the first installment one month after today when no date is sent", async () => {
    const { firstInstallmentDate: _omitted, ...withoutDate } = BASE;

    const data = await simulation({ ...withoutDate, interestType: "FLAT" });

    const dueDate = data.schedule[0]?.dueDate ?? "";
    expect(dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dueDate > new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("AC-51.03 rejects a missing tenor with VALIDATION_FAILED and Tenor is required", async () => {
    const { tenor: _omitted, ...withoutTenor } = BASE;

    const res = await simulate({ ...withoutTenor, interestType: "EFFECTIVE" });

    expect(res.statusCode).toBe(400);
    const error = errorEnvelopeSchema.parse(res.json());
    expect(error).toMatchObject({ code: "VALIDATION_FAILED", message: "Please complete all required fields" });
    expect(error.details).toEqual([expect.objectContaining({ field: "tenor", message: "Tenor is required" })]);
  });

  it("answers NOT_IMPLEMENTED for the deferred interest types (TRM_INS_003 to TRM_INS_007)", async () => {
    const res = await simulate({ ...BASE, interestType: "FLOATING", spreadRate: "2.0000" });

    expect(res.statusCode).toBe(501);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "NOT_IMPLEMENTED",
      message: "This operation is not implemented yet",
    });
  });

  it("rejects a user without Installment Simulation View with ACCESS_DENIED", async () => {
    const res = await simulate({ ...BASE, interestType: "FLAT" }, maker);

    expect(res.statusCode).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json()).code).toBe("ACCESS_DENIED");
  });
});
