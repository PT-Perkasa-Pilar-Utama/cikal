import type { AdapterDescriptor, AdapterOutcome, IntegrationPort, ModuleCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "../src/app.factory.js";
import { type CallContext, IntegrationApi } from "../src/modules/core/integration/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { startDatabase, type TestDatabase } from "./support/database.js";

const TENANT = seedCompanyIds.company001;

/** Kontrak kanonik uji, bentuk port M07 (technical-specs 13 §13.2). */
const checkSchema = z.object({ nik: z.string(), fullName: z.string() });
const resultSchema = z.object({ recordFound: z.boolean() });
type Check = z.infer<typeof checkSchema>;
type Result = z.infer<typeof resultSchema>;
const portFor = (moduleCode: ModuleCode): IntegrationPort<Check, Result> => ({
  moduleCode,
  request: checkSchema,
  response: resultSchema,
});

const REQUEST = { nik: "3171010101900001", fullName: "Rudi Hartono" };

/** Adapter uji: `call` menjawab sesuai `behave`, dan permintaan terakhir disimpan. */
function testAdapter(
  providerCode: string,
  moduleCode: ModuleCode,
  isSimulation: boolean,
  behave: () => Promise<AdapterOutcome<unknown>>,
): AdapterDescriptor<Check, unknown> & { received: unknown[] } {
  const received: unknown[] = [];
  return {
    providerCode,
    moduleCode,
    supportedModes: ["SYNC"],
    isSimulation,
    settingsSchema: z.object({}),
    adapterVersion: "1.0.0",
    received,
    call: (req) => {
      received.push(req);
      return behave();
    },
    testConnection: async () => undefined,
  };
}

async function insertConfig(
  owner: pg.Pool,
  moduleCode: ModuleCode,
  providerCode: string,
  timeoutSeconds = 30,
): Promise<void> {
  await owner.query(
    `insert into integration.integration_configs (id, tenant_id, module_code, provider_code, mode, timeout_seconds,
       version_number, status, effective_from)
     values ($1, $2, $3, $4, 'SYNC', $5, 1, 'ACTIVE', now())`,
    [uuidv7(), TENANT, moduleCode, providerCode, timeoutSeconds],
  );
}

interface CallLogRow {
  module_code: string;
  provider_code: string | null;
  status: string;
  error_category: string | null;
  error_message: string | null;
  attempt: number;
  request_masked: unknown;
  response_masked: unknown;
}

/** Integration Registry: resolusi konfigurasi, simulasi per lingkungan, batas waktu, dan log (technical-specs 13). */
describe("IntegrationApi", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let api: IntegrationApi;

  const context = (): CallContext => ({ tenantId: TENANT, correlationId: uuidv7(), attempt: 2 });
  const logOf = async (ctx: CallContext): Promise<CallLogRow | undefined> => {
    const { rows } = await db.owner.query<CallLogRow>(
      `select module_code, provider_code, status, error_category, error_message, attempt, request_masked,
              response_masked
         from integration.integration_call_logs where correlation_id = $1`,
      [ctx.correlationId],
    );
    expect(rows).toHaveLength(1);
    return rows[0];
  };

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

  it("calls the active adapter with canonical fields only and logs the call with PII masked", async () => {
    const adapter = testAdapter("SIMULATION_M07", "M07", true, async () => ({
      ok: true,
      response: { recordFound: true },
      raw: { NIK: "3171010101900001", status: "FOUND" },
    }));
    api.registerAdapter(adapter);
    await insertConfig(db.owner, "M07", "SIMULATION_M07");
    const ctx = context();
    const withExtraField = { ...REQUEST, motherMaidenName: "Siti Aminah" };

    const outcome = await api.invoke(portFor("M07"), withExtraField, ctx);

    expect(outcome).toEqual({ ok: true, response: { recordFound: true }, raw: expect.anything() });
    expect(adapter.received).toEqual([REQUEST]);
    expect(await logOf(ctx)).toEqual({
      module_code: "M07",
      provider_code: "SIMULATION_M07",
      status: "SUCCESS",
      error_category: null,
      error_message: null,
      attempt: 2,
      request_masked: { nik: "************0001", fullName: "Rudi Hartono" },
      response_masked: { NIK: "************0001", status: "FOUND" },
    });
    expect(await api.activeMode(TENANT, "M07")).toBe("SYNC");
  });

  it("stops waiting after the configured timeout and reports a TIMEOUT", async () => {
    api.registerAdapter(testAdapter("SLOW_M10", "M10", false, () => new Promise(() => undefined)));
    await insertConfig(db.owner, "M10", "SLOW_M10", 1);
    const ctx = context();

    const outcome = await api.invoke(portFor("M10"), REQUEST, ctx);

    expect(outcome).toEqual({
      ok: false,
      category: "TIMEOUT",
      message: "Provider did not respond within 1 seconds",
    });
    expect(await logOf(ctx)).toMatchObject({ status: "ERROR", error_category: "TIMEOUT", response_masked: null });
  });

  it("reports CONFIG when the module has no active provider (IN-09)", async () => {
    const ctx = context();

    const outcome = await api.invoke(portFor("M16"), REQUEST, ctx);

    expect(outcome).toEqual({ ok: false, category: "CONFIG", message: "Integration provider not configured" });
    expect(await logOf(ctx)).toMatchObject({ provider_code: null, status: "ERROR", error_category: "CONFIG" });
    expect(await api.activeMode(TENANT, "M16")).toBe("NONE");
  });

  it("reports INVALID_RESPONSE when the adapter answers outside the canonical contract", async () => {
    api.registerAdapter(
      testAdapter("BROKEN_M08", "M08", false, async () => ({ ok: true, response: { found: "yes" }, raw: null })),
    );
    await insertConfig(db.owner, "M08", "BROKEN_M08");

    const outcome = await api.invoke(portFor("M08"), REQUEST, context());

    expect(outcome).toMatchObject({ ok: false, category: "INVALID_RESPONSE" });
  });

  it("reports CONNECTION when the adapter throws", async () => {
    api.registerAdapter(
      testAdapter("DOWN_M13", "M13", false, async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    );
    await insertConfig(db.owner, "M13", "DOWN_M13");

    const outcome = await api.invoke(portFor("M13"), REQUEST, context());

    expect(outcome).toEqual({ ok: false, category: "CONNECTION", message: "connect ECONNREFUSED" });
  });

  it("refuses simulation adapters where the environment does not allow them (IN-03)", async () => {
    const strict = await createApp({ ...db.config, allowSimulationAdapters: false });
    await strict.init();
    try {
      const adapter = testAdapter("SIMULATION_M07", "M07", true, async () => ({
        ok: true,
        response: { recordFound: true },
        raw: null,
      }));
      strict.get(IntegrationApi).registerAdapter(adapter);

      const outcome = await strict.get(IntegrationApi).invoke(portFor("M07"), REQUEST, context());

      expect(outcome).toEqual({
        ok: false,
        category: "CONFIG",
        message: "Simulation adapters are not allowed in this environment",
      });
      expect(adapter.received).toEqual([]);
    } finally {
      await strict.close();
    }
  });

  it("rejects registering the same provider code twice", () => {
    const adapter = testAdapter("DUPLICATE_M15", "M15", false, async () => ({ ok: true, response: {}, raw: null }));
    api.registerAdapter(adapter);

    expect(() => api.registerAdapter(adapter)).toThrow("Adapter DUPLICATE_M15 is already registered");
  });
});
