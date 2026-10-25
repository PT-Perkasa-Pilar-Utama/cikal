import { applicationScoringResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { ipReputationSimulationAddresses } from "../src/modules/addons/m08-fraud/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedProductIds } from "../src/modules/core/product/index.js";
import { occupationBody, personalBody, sectionClient } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  applicationState,
  drainProcessJobs,
  latestSteps,
  registerStepHandlers,
  startProcess,
} from "./support/process.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

/** Produk KTA QA seed `qa` untuk spec wiring FE-S4-02 (#48): langkah otomatis asli dari Dedup sampai Decision. */
describe("qa KTA product", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let client: ReturnType<typeof sectionClient>;

  beforeAll(async () => {
    db = await startDatabase("qa");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const role = await createRole(db.owner, "Sales QA", [
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

  it("runs Dedup to Decision with the seeded models and simulation adapters and decides Go", async () => {
    const id = await client.createDraft(sales, seedProductIds.ktaQa);
    await client.save(sales, id, "personal", personalBody());
    await client.save(sales, id, "occupation", occupationBody);
    // Alamat KTP uji di provinsi 32; IP simulasi `otherProvince` juga provinsi 32, jadi cek lokasi IP normal.
    await db.owner.query(
      `update application.applications set status = 'ON_PROGRESS', submitted_at = now(), submitted_by = created_by,
              client_ip_address = $2 where id = $1`,
      [id, ipReputationSimulationAddresses.otherProvince],
    );

    const processId = await startProcess(app, id);
    await drainProcessJobs(app, db.owner);

    const outcomes = Object.fromEntries(
      [...(await latestSteps(db.owner, processId))].map(([code, step]) => [code, step.outcome_code ?? step.status]),
    );
    expect(outcomes).toMatchObject({
      DEDUP: "UNMATCH",
      DUKCAPIL: "PASSED",
      FRAUD: "CLEAN",
      RAC: "PASS",
      SCORING: "PASS",
      CREDIT_BUREAU: "COLLECT_1",
      DECISION: "GO",
    });
    expect(await applicationState(db.owner, id)).toMatchObject({ status: "APPROVED" });
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${id}/scoring`,
      headers: inquirer.headers,
    });
    expect(applicationScoringResponseSchema.parse(res.json()).data.scoring).toMatchObject({
      modelCode: "KTA-2026",
      totalScore: "470.00",
      result: "PASS",
    });
  });
});
