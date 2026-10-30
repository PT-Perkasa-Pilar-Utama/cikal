import {
  errorEnvelopeSchema,
  regionOptionsResponseSchema,
  regionSearchResponseSchema,
  regionSyncStartedResponseSchema,
  regionSyncStateResponseSchema,
  subDistrictOptionsResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, createWorkerContext } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { ScheduledRegionSync } from "../src/modules/core/masterdata/application/scheduled-region-sync.js";
import { REGION_SYNC_SCHEDULE_QUEUE } from "../src/modules/core/masterdata/jobs/queues.js";
import type { AppConfig } from "../src/platform/config/config.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { JobQueue } from "../src/platform/queue/job-queue.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { createSession, type TestSession } from "./support/session.js";

const UNKNOWN_ID = "0192b6d0-ffff-7000-8000-000000000001";
const WAIT_MS = 15_000;
const POLL_MS = 200;

type Response = { statusCode: number; body: string; json(): unknown };

/** Data wilayah: sinkronisasi Oksara, pencarian, dan dropdown berjenjang (api-specs 06 §6.3, US-23). */
describe("regions", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let maker: TestSession;
  let sales: TestSession;
  let noAccess: TestSession;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    maker = await createSession(db.owner, { roleId: seedRoleIds.maker });
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    noAccess = await createSession(db.owner, { roleId: null });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const send = (session: TestSession, method: "GET" | "POST", url: string) =>
    app.inject({ method, url: `/api/v1/regions${url}`, headers: session.headers });
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode, res.body).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  const startSync = async () => {
    const res = await send(maker, "POST", "/sync");
    expect(res.statusCode, res.body).toBe(202);
    return regionSyncStartedResponseSchema.parse(res.json()).data;
  };
  const syncState = async (syncId: string) => {
    const res = await send(maker, "GET", `/sync/${syncId}`);
    expect(res.statusCode, res.body).toBe(200);
    return regionSyncStateResponseSchema.parse(res.json());
  };
  /** Menjalankan worker dengan adapter dari `regionApi` sampai sinkronisasi selesai, lalu menutupnya. */
  const runWorker = async (syncId: string, regionApi: AppConfig["regionApi"] = db.config.regionApi) => {
    const worker = await createWorkerContext({ ...db.config, processRole: "worker", regionApi });
    await worker.get(JobQueue).startConsumers();
    try {
      const until = Date.now() + WAIT_MS;
      while (Date.now() < until) {
        const state = await syncState(syncId);
        if (state.data.status !== "RUNNING") return state;
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      throw new Error(`Region sync ${syncId} did not finish`);
    } finally {
      await worker.close();
    }
  };
  const regionRows = async () =>
    (
      await db.owner.query(
        `select s.sub_district_code, s.sub_district_name, s.zip_code, s.last_sync_at, d.district_name, c.city_name,
                p.province_name
           from masterdata.sub_districts s
           join masterdata.districts d using (district_code)
           join masterdata.cities c using (city_code)
           join masterdata.provinces p using (province_code)
          order by s.sub_district_code`,
      )
    ).rows;

  it("rejects a second sync while one is running", async () => {
    const running = await startSync();

    expectError(await send(maker, "POST", "/sync"), 409, "SYNC_IN_PROGRESS", "Region sync is already running");
    await runWorker(running.syncId);
  });

  it("AC-23.01 reports the added and updated regions and stamps Last Sync", async () => {
    await db.owner.query("delete from masterdata.sub_districts; delete from masterdata.districts");
    await db.owner.query("delete from masterdata.cities; delete from masterdata.provinces");
    const stale = new Date("2026-01-01T00:00:00Z");
    await db.owner.query(
      "insert into masterdata.provinces (id, province_code, province_name, last_sync_at) values ($1, '31', 'DKI', $2)",
      ["0192b6d0-0002-7000-8000-000000000001", stale],
    );
    await db.owner.query(
      `insert into masterdata.cities (id, city_code, city_name, province_code, last_sync_at)
       values ($1, '3171', 'JAKARTA PUSAT', '31', $2)`,
      ["0192b6d0-0002-7000-8000-000000000002", stale],
    );
    await db.owner.query(
      `insert into masterdata.districts (id, district_code, district_name, city_code, last_sync_at)
       values ($1, '317101', 'GAMBIR LAMA', '3171', $2)`,
      ["0192b6d0-0002-7000-8000-000000000003", stale],
    );

    const started = await startSync();
    expect(started.status).toBe("RUNNING");
    const done = await runWorker(started.syncId);

    expect(done.message).toBe("Region sync completed: 12 added, 3 updated");
    expect(done.data).toMatchObject({ status: "COMPLETED", added: 12, updated: 3 });
    const finishedAt = done.data.status === "COMPLETED" ? done.data.finishedAt : null;
    expect(done.data).toMatchObject({ lastSyncAt: finishedAt });
    const rows = await regionRows();
    expect(rows).toHaveLength(6);
    for (const row of rows) expect(row.last_sync_at.toISOString()).toBe(finishedAt);
    const search = regionSearchResponseSchema.parse((await send(maker, "GET", "/search?q=jakarta")).json());
    expect(search.meta.lastSyncAt).toBe(finishedAt);
  });

  it("AC-23.02 keeps the existing regions when the region service does not respond", async () => {
    const before = await regionRows();
    const started = await startSync();

    const failed = await runWorker(started.syncId, { url: "http://127.0.0.1:1", apiKey: "unreachable" });

    expect(failed.message).toBe("Region sync failed. Existing data is unchanged");
    expect(failed.data).toEqual({ status: "FAILED", errorCategory: "CONNECTION" });
    expect(await regionRows()).toEqual(before);
  });

  it("schedules the region sync weekly on Sunday at 02.00 Asia/Jakarta", async () => {
    const worker = await createWorkerContext({ ...db.config, processRole: "worker" });
    try {
      await worker.get(JobQueue).startConsumers();

      const { rows } = await db.owner.query(
        "select cron, timezone from pgboss.schedule where name = 'masterdata.region-sync-schedule'",
      );
      expect(rows).toEqual([{ cron: "0 2 * * 0", timezone: "Asia/Jakarta" }]);
    } finally {
      await worker.close();
    }
  });

  it("runs the scheduled sync like the manual one, with no user as the actor", async () => {
    const worker = await createWorkerContext({ ...db.config, processRole: "worker" });
    await worker
      .get(TenantTx)
      .withInstallationTx((tx) => worker.get(JobQueue).enqueue(tx, REGION_SYNC_SCHEDULE_QUEUE, {}));
    await worker.get(JobQueue).startConsumers();
    let sync: { id: string; created_by: string | null } | undefined;
    try {
      const until = Date.now() + WAIT_MS;
      while (!sync && Date.now() < until) {
        [sync] = (
          await db.owner.query("select id, created_by from masterdata.region_syncs where created_by is null")
        ).rows;
        if (!sync) await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
    } finally {
      await worker.close();
    }
    if (!sync) throw new Error("The scheduled region sync did not start");

    expect(sync.created_by).toBeNull();
    expect((await runWorker(sync.id)).data).toMatchObject({ status: "COMPLETED" });
  });

  it("skips the scheduled sync while a manual sync is running", async () => {
    const manual = await startSync();
    const worker = await createWorkerContext({ ...db.config, processRole: "worker" });
    try {
      await worker.get(ScheduledRegionSync).run();
    } finally {
      await worker.close();
    }

    const { rows } = await db.owner.query("select id from masterdata.region_syncs where status = 'RUNNING'");
    expect(rows).toEqual([{ id: manual.syncId }]);
    await runWorker(manual.syncId);
  });

  it("AC-23.03 finds regions containing the text in any level or zip code, ignoring case", async () => {
    const search = async (q: string) => {
      const res = await send(maker, "GET", `/search?q=${q}`);
      expect(res.statusCode, res.body).toBe(200);
      return regionSearchResponseSchema.parse(res.json());
    };

    const gam = await search("gam");
    expect(gam.data.map((row) => row.subDistrictName)).toEqual(["GAMBIR", "CIDENG"]);
    expect(gam.data[0]).toEqual({
      provinceCode: "31",
      provinceName: "DKI JAKARTA",
      cityCode: "3171",
      cityName: "KOTA JAKARTA PUSAT",
      districtCode: "317101",
      districtName: "GAMBIR",
      subDistrictCode: "3171011001",
      subDistrictName: "GAMBIR",
      zipCode: "10110",
    });
    expect(gam.meta).toMatchObject({ totalItems: 2, totalPages: 1 });
    expect((await search("GaM")).meta.totalItems).toBe(2);
    expect((await search("bandung")).data.map((row) => row.subDistrictName)).toEqual(["SARIJADI", "GEGERKALONG"]);
    expect((await search("1444")).data.map((row) => row.subDistrictName)).toEqual(["PENJARINGAN"]);
    expect((await search("utara")).meta.totalItems).toBe(1);
    expect((await search("50%")).meta.totalItems).toBe(0);
  });

  it("rejects a search shorter than three characters", async () => {
    expectError(
      await send(maker, "GET", "/search?q=ga"),
      400,
      "VALIDATION_FAILED",
      "Please complete all required fields",
    );
  });

  it("AC-23.04 lists only the cities of the selected province", async () => {
    const res = await send(maker, "GET", "/cities?provinceCode=31");

    expect(res.statusCode, res.body).toBe(200);
    expect(regionOptionsResponseSchema.parse(res.json()).data).toEqual([
      { code: "3171", name: "KOTA JAKARTA PUSAT", parentCode: "31" },
      { code: "3172", name: "KOTA JAKARTA UTARA", parentCode: "31" },
    ]);
  });

  it("AC-23.04 cascades provinces, districts, and sub-districts with zip codes for application entry", async () => {
    const options = async (url: string) => {
      const res = await send(sales, "GET", url);
      expect(res.statusCode, res.body).toBe(200);
      return res.json();
    };

    expect(regionOptionsResponseSchema.parse(await options("/provinces")).data.map((p) => p.name)).toEqual([
      "DKI JAKARTA",
      "JAWA BARAT",
    ]);
    expect(regionOptionsResponseSchema.parse(await options("/provinces?q=jawa")).data).toEqual([
      { code: "32", name: "JAWA BARAT", parentCode: null },
    ]);
    expect(
      regionOptionsResponseSchema.parse(await options("/districts?cityCode=3171")).data.map((d) => d.code),
    ).toEqual(["317101", "317102"]);
    expect(subDistrictOptionsResponseSchema.parse(await options("/sub-districts?districtCode=317101")).data).toEqual([
      { code: "3171011002", name: "CIDENG", parentCode: "317101", zipCode: "10150" },
      { code: "3171011001", name: "GAMBIR", parentCode: "317101", zipCode: "10110" },
    ]);
  });

  it("AC-23.04 requires the parent code of a cascading dropdown", async () => {
    expectError(await send(maker, "GET", "/cities"), 400, "VALIDATION_FAILED", "Please complete all required fields");
  });

  it("denies the dropdowns without View on Region Data or application entry", async () => {
    expectError(await send(noAccess, "GET", "/provinces"), 403, "ACCESS_DENIED", "You do not have access to this page");
  });

  it("denies a sync without Update on Region Data", async () => {
    expectError(
      await send(sales, "POST", "/sync"),
      403,
      "ACTION_DENIED",
      "You do not have permission to perform this action",
    );
  });

  it("answers 404 for an unknown sync", async () => {
    expectError(await send(maker, "GET", `/sync/${UNKNOWN_ID}`), 404, "NOT_FOUND", "Data not found");
  });
});
