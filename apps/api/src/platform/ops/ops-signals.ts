import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { sql } from "drizzle-orm";
import pg from "pg";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import type { Tx } from "../db/tenant-tx.js";
import { isOpsSignal, OPS_CHANNEL, type OpsSignal } from "../migrate/runner.js";

const RETRY_MS = 5_000;

/** NOTIFY di transaksi pemanggil: proses lain menerimanya hanya bila transaksi commit. */
export async function publishOpsSignal(tx: Tx, signal: OpsSignal): Promise<void> {
  await tx.execute(sql`select pg_notify(${OPS_CHANNEL}, ${signal})`);
}

/**
 * Berlangganan channel `cikal_ops` dengan koneksi khusus (LISTEN tidak bisa lewat pool).
 * Best effort: koneksi gagal dicoba ulang tiap 5 detik tanpa menghentikan proses.
 * Mengembalikan fungsi untuk berhenti berlangganan.
 */
export function listenOpsSignals(
  connectionString: string,
  onSignal: (signal: OpsSignal) => void,
  logger: Pick<Logger, "warn"> = new Logger("OpsSignals"),
): () => Promise<void> {
  let client: pg.Client | null = null;
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const connect = async () => {
    const next = new pg.Client({ connectionString });
    next.on("notification", (message) => {
      if (message.channel === OPS_CHANNEL && message.payload && isOpsSignal(message.payload)) onSignal(message.payload);
    });
    next.on("error", (error) => {
      logger.warn(`LISTEN ${OPS_CHANNEL} lost: ${error.message}`);
      next.end().catch(() => undefined);
      if (client === next) client = null;
      schedule();
    });
    try {
      await next.connect();
      await next.query(`LISTEN ${OPS_CHANNEL}`);
      if (stopped) {
        await next.end();
        return;
      }
      client = next;
    } catch (error) {
      await next.end().catch(() => undefined);
      logger.warn(`LISTEN ${OPS_CHANNEL} failed: ${error instanceof Error ? error.message : String(error)}`);
      schedule();
    }
  };

  const schedule = () => {
    if (stopped || timer) return;
    timer = setTimeout(() => {
      timer = null;
      void connect();
    }, RETRY_MS);
  };

  void connect();

  return async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    await client?.end().catch(() => undefined);
  };
}

/** Sinyal operasional untuk proses api: penerima mendaftar lewat `on`, misalnya membuang cache saat reset selesai. */
@Injectable()
export class OpsSignals implements OnModuleInit, OnModuleDestroy {
  private readonly handlers = new Set<(signal: OpsSignal) => void>();
  private stop: (() => Promise<void>) | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  on(handler: (signal: OpsSignal) => void): void {
    this.handlers.add(handler);
  }

  /** Dipanggil juga langsung oleh proses yang menjalankan reset, tanpa menunggu NOTIFY kembali. */
  emit(signal: OpsSignal): void {
    for (const handler of this.handlers) handler(signal);
  }

  onModuleInit(): void {
    if (this.config.appEnv === "test") return;
    this.stop = listenOpsSignals(this.config.database.url, (signal) => this.emit(signal));
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop?.();
  }
}
