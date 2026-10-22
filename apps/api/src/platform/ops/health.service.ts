import type { HealthStatus, ReadyResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type pg from "pg";
import { licensedModuleData } from "../../licensed-modules.generated.js";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { DB_POOL } from "../db/database.module.js";
import { latestMigration } from "../migrate/runner.js";
import { StorageService } from "../storage/storage.module.js";
import { OpsSignals } from "./ops-signals.js";

const PROBE_TIMEOUT_MS = 2_000;
const CACHE_MS = 5_000;

type Probe = { status: HealthStatus; latencyMs: number; error?: string };

/**
 * Kesiapan dan status dependensi (api-specs 27 §27.2). Database dan storage kritis: gagal = `down`.
 * Konverter PDF non-kritis: gagal = `degraded`. Antrean dan integrasi ditambahkan saat modulnya dibangun.
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
    const [database, objectStorage, pdfConverter] = await Promise.all([
      this.probe(async (signal) => {
        migration = await this.inspectDatabase(signal);
      }),
      this.probe((signal) => this.storage.ping(signal)),
      this.config.gotenbergUrl ? this.probe((signal) => this.pingGotenberg(signal)) : Promise.resolve(null),
    ]);
    const critical = [database, objectStorage];
    const status: HealthStatus = critical.some((p) => p.status === "down")
      ? "down"
      : pdfConverter?.status === "down"
        ? "degraded"
        : "ok";
    const value: ReadyResponse = {
      status,
      version: this.config.version,
      checkedAt: new Date(now).toISOString(),
      dependencies: {
        database: { ...database, migration },
        objectStorage,
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
      return await latestMigration(client, licensedModuleData);
    } finally {
      signal.removeEventListener("abort", onAbort);
      if (!signal.aborted) client.release();
    }
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
