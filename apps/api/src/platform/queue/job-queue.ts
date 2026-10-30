import { Inject, Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import { type SQL, sql } from "drizzle-orm";
import PgBoss from "pg-boss";
import type { z } from "zod";
import { BUSINESS_TIME_ZONE } from "../clock/business-date.js";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import type { Tx } from "../db/tenant-tx.js";
import { QUEUE_SCHEMA } from "./queue-definition.js";

export interface EnqueueOptions {
  /** Job baru boleh diambil worker setelah waktu ini, contoh jeda retry atau batas tunggu. */
  startAfter?: Date;
}

type Consumer = (data: unknown) => Promise<void>;

const POSITIONAL_PARAMETER = /\$(\d+)/g;
/** Jeda antar langkah otomatis di bawah 1 detik p95 (technical-specs 12 §12.4). */
const POLLING_INTERVAL_SECONDS = 0.5;

/** SQL pg-boss berparameter `$n` sebagai SQL Drizzle, agar job ditulis di transaksi pemanggil. */
function positional(text: string, values: readonly unknown[]): SQL {
  const chunks: SQL[] = [];
  let last = 0;
  for (const match of text.matchAll(POSITIONAL_PARAMETER)) {
    chunks.push(sql.raw(text.slice(last, match.index)), sql`${sql.param(values[Number(match[1]) - 1])}`);
    last = match.index + match[0].length;
  }
  chunks.push(sql.raw(text.slice(last)));
  return sql.join(chunks);
}

/**
 * Antrean job pg-boss (technical-specs 05 §5.0.1 `enqueue`, 12 §12.1). Proses api hanya menulis job lewat
 * transaksi pemanggil dan tidak pernah memulai pg-boss; proses worker memulai pg-boss dan konsumen.
 */
@Injectable()
export class JobQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(JobQueue.name);
  private readonly consumers = new Map<string, Consumer>();
  private readonly schedules = new Map<string, string>();
  private readonly boss: PgBoss;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.boss = new PgBoss({
      connectionString: config.database.url,
      schema: QUEUE_SCHEMA,
      max: config.worker.concurrency + 1,
      migrate: false,
      supervise: config.processRole === "worker",
      schedule: config.processRole === "worker",
    });
    this.boss.on("error", (error) => this.logger.error(error.message, error.stack));
  }

  /** Job tidak terlihat worker sebelum `tx` commit, dan ikut batal bila `tx` batal (CODING_STANDARD §6.2). */
  async enqueue(tx: Tx, name: string, data: object, options: EnqueueOptions = {}): Promise<string> {
    const db = { executeSql: async (text: string, values: unknown[]) => tx.execute(positional(text, values)) };
    const id = await this.boss.send(name, data, { ...options, db });
    if (!id) throw new Error(`Queue ${name} is not installed`);
    return id;
  }

  /** Mendaftarkan konsumen antrean; payload job dari database dipersempit skema sebelum dipakai (CODING_STANDARD §1.3). */
  consume<S extends z.ZodType>(name: string, schema: S, handler: (data: z.infer<S>) => Promise<void>): void {
    this.consumers.set(name, (data) => handler(schema.parse(data)));
  }

  /** Mendaftarkan job berulang `cron` waktu Asia/Jakarta; antreannya juga butuh konsumen lewat `consume`. */
  schedule(name: string, cron: string): void {
    this.schedules.set(name, cron);
  }

  /**
   * Proses worker: memulai pg-boss, memasang jadwal, lalu `WORKER_CONCURRENCY` konsumen per antrean (technical-specs
   * 11 §11.2). Jadwal dipasang ulang setiap mulai karena reset state menghapus skema pg-boss.
   */
  async startConsumers(): Promise<void> {
    await this.boss.start();
    for (const [name, cron] of this.schedules) {
      await this.boss.schedule(name, cron, {}, { tz: BUSINESS_TIME_ZONE });
    }
    for (const [name, consumer] of this.consumers) {
      for (let slot = 0; slot < this.config.worker.concurrency; slot++) {
        await this.boss.work(name, { pollingIntervalSeconds: POLLING_INTERVAL_SECONDS }, async (jobs) => {
          for (const job of jobs) await consumer(job.data);
        });
      }
    }
  }

  /** Berhenti mengambil job, contoh saat reset state (api-specs 27 §27.4); job aktif diselesaikan lebih dulu. */
  async stopConsumers(): Promise<void> {
    await this.boss.stop({ graceful: true, wait: true, close: true });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.stopConsumers();
  }
}
