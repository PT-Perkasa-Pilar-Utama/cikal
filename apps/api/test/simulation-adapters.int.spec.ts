import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { dukcapilPort, dukcapilSimulationNiks } from "../src/modules/addons/m07-dukcapil/index.js";
import { ipReputationPort } from "../src/modules/addons/m08-fraud/index.js";
import { creditBureauPort } from "../src/modules/addons/m10-credit-bureau/index.js";
import { type CallContext, IntegrationApi } from "../src/modules/core/integration/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const TENANT = seedCompanyIds.company001;
const APPLICANT = {
  fullName: "Rudi Hartono",
  motherMaidenName: "Siti",
  dateOfBirth: "1990-02-14",
  placeOfBirth: "Bandung",
};

/** Adapter simulasi M07, M08, M10 terpasang bersama modulnya dan dikonfigurasi seed `dev` (technical-specs 13). */
describe("simulation adapters", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let api: IntegrationApi;
  const context = (): CallContext => ({ tenantId: TENANT, correlationId: uuidv7(), attempt: 1 });

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    api = app.get(IntegrationApi);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("answers Dukcapil, IP reputation, and SLIK through the seeded configuration of company 001", async () => {
    const nik = "3171010101900001";

    const dukcapil = await api.invoke(dukcapilPort, { nik, ...APPLICANT }, context());
    const ip = await api.invoke(ipReputationPort, { ipAddress: "198.51.100.7" }, context());
    const slik = await api.invoke(creditBureauPort, { nik, ...APPLICANT, purposeCode: "KONSUMSI" }, context());

    expect(dukcapil).toMatchObject({ ok: true, response: { recordFound: true, fullNameScore: "1.0000" } });
    expect(ip).toMatchObject({ ok: true, response: { isVpnOrProxy: false, province: "31" } });
    expect(slik).toMatchObject({ ok: true, response: { hasHistory: true } });
  });

  it("AC-61.02 reports TIMEOUT when the Dukcapil service does not answer within the configured time", async () => {
    await db.owner.query(
      "update integration.integration_configs set timeout_seconds = 1 where tenant_id = $1 and module_code = 'M07'",
      [TENANT],
    );
    const ctx = context();

    const outcome = await api.invoke(dukcapilPort, { nik: dukcapilSimulationNiks.timeout, ...APPLICANT }, ctx);

    expect(outcome).toEqual({ ok: false, category: "TIMEOUT", message: "Provider did not respond within 1 seconds" });
    const { rows } = await db.owner.query<{ provider_code: string; error_category: string }>(
      "select provider_code, error_category from integration.integration_call_logs where correlation_id = $1",
      [ctx.correlationId],
    );
    expect(rows).toEqual([{ provider_code: "SIMULATION_M07", error_category: "TIMEOUT" }]);
  });
});
