import type { HealthStatus, ReadyResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type pg from "pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DB_POOL } from "../db/database.js";
import { installedModuleData } from "../migrate/installed-modules.js";
import { latestMigration } from "../migrate/runner.js";
import { QUEUE_SCHEMA } from "../queue/queue-definition.js";
import { StorageService } from "../storage/storage.module.js";
import { OpsSignals } from "./ops-signals.js";

const PROBE_TIMEOUT_MS = 2_000;
const CACHE_MS = 5_000;

type Probe = { status: HealthStatus; latencyMs: number; error?: string };

/**
 * Kesiapan dan status dependensi (api-specs 27 §27.2). Database dan storage kritis: gagal = `down`.
 * Antrean dan konverter PDF non-kritis: gagal = `degraded`. Integrasi ditambahkan saat modulnya dibangun.
 */
@Injectable()
export class HealthService {
  private cached: { at: number; value: ReadyResponse } | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB_POOL) private readonly pool: pg.Pool,
    private readonly storage: StorageService,
    signals: OpsSignals,
  ) {
    signals.on(() => {
      this.cached = null;
    });
  }

  async ready(now = Date.now()): Promise<ReadyResponse> {
    if (this.cached && now - this.cached.at < CACHE_MS) {
      return this.cached.value;
    }
    let migration: string | null = null;
    let jobs = { pending: 0, failedLastHour: 0 };
    const [database, objectStorage, queue, pdfConverter] = await Promise.all([
      this.probe(async (signal) => {
        migration = await this.inspectDatabase(signal);
      }),
      this.probe((signal) => this.storage.ping(signal)),
      this.probe(async () => {
        jobs = await this.countJobs();
      }),
      this.config.gotenbergUrl ? this.probe((signal) => this.pingGotenberg(signal)) : Promise.resolve(null),
    ]);
    const critical = [database, objectStorage];
    const status: HealthStatus = critical.some((p) => p.status === "down")
      ? "down"
      : [queue, pdfConverter].some((p) => p?.status === "down")
        ? "degraded"
        : "ok";
    const value: ReadyResponse = {
      status,
      version: this.config.version,
      checkedAt: new Date(now).toISOString(),
      dependencies: {
        database: { ...database, migration },
        objectStorage,
        queue: { ...queue, ...jobs },
        ...(pdfConverter ? { pdfConverter } : {}),
      },
    };
    this.cached = { at: now, value };
    return value;
  }

  /** `select 1` lalu migrasi terakhir dari ledger modul berlisensi. */
  private async inspectDatabase(signal: AbortSignal): Promise<string | null> {
    const client = await this.pool.connect();
    const onAbort = () => client.release(new Error("probe timeout"));
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      await client.query("select 1");
      return await latestMigration(client, installedModuleData);
    } finally {
      signal.removeEventListener("abort", onAbort);
      if (!signal.aborted) client.release();
    }
  }

  /** Job pending dan gagal satu jam terakhir di skema pg-boss. */
  private async countJobs(): Promise<{ pending: number; failedLastHour: number }> {
    const { rows } = await this.pool.query<{ pending: number; failed: number }>(
      `select count(*) filter (where state in ('created', 'retry'))::int as pending,
              count(*) filter (where state = 'failed' and completed_on > now() - interval '1 hour')::int as failed
         from ${QUEUE_SCHEMA}.job`,
    );
    return { pending: rows[0]?.pending ?? 0, failedLastHour: rows[0]?.failed ?? 0 };
  }

  private async pingGotenberg(signal: AbortSignal): Promise<void> {
    const response = await fetch(new URL("/health", this.config.gotenbergUrl ?? ""), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  private async probe(run: (signal: AbortSignal) => Promise<void>): Promise<Probe> {
    const started = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      await Promise.race([
        run(controller.signal),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener("abort", () => reject(new Error("TIMEOUT")), { once: true }),
        ),
      ]);
      return { status: "ok", latencyMs: Math.round(performance.now() - started) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { status: "down", latencyMs: Math.round(performance.now() - started), error: message.slice(0, 200) };
    } finally {
      clearTimeout(timer);
    }
  }
}
