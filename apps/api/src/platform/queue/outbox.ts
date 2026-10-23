import { Injectable, type OnModuleInit } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { OutboxEventsRepository } from "../db/outbox-events.repository.js";
import { TenantTx, type Tx } from "../db/tenant-tx.js";
import { JobQueue } from "./job-queue.js";
import { OUTBOX_QUEUE, type OutboxJob, outboxJobSchema } from "./outbox-queues.js";

/** Event lintas modul (technical-specs 02 §2.8 XM-04); `payload` tanpa field sensitif (technical-specs 06 §6.3). */
export interface OutboxEvent {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

/** Penerima event; dipanggil di transaksi worker dan bisa menerima event yang sama lebih dari sekali. */
export type OutboxHandler = (tx: Tx, event: OutboxEvent) => Promise<void>;

/**
 * Outbox (technical-specs 05 §5.0.1 `publish`): event ditulis di transaksi aksi bersama job pengirimnya, lalu worker
 * memanggil handler yang terdaftar setelah commit (at-least-once). Event tanpa handler langsung ditandai terkirim.
 */
@Injectable()
export class Outbox implements OnModuleInit {
  private readonly handlers = new Map<string, OutboxHandler[]>();

  constructor(
    private readonly db: TenantTx,
    private readonly events: OutboxEventsRepository,
    private readonly queue: JobQueue,
  ) {}

  onModuleInit(): void {
    this.queue.consume(OUTBOX_QUEUE, outboxJobSchema, (job) => this.dispatch(job));
  }

  /** Modul penerima mendaftar saat `onModuleInit`. */
  on(eventType: string, handler: OutboxHandler): void {
    this.handlers.set(eventType, [...(this.handlers.get(eventType) ?? []), handler]);
  }

  async publish(tx: Tx, event: OutboxEvent): Promise<string> {
    const id = uuidv7();
    await this.events.insert(tx, { id, ...event });
    await this.queue.enqueue(tx, OUTBOX_QUEUE, { tenantId: event.tenantId, eventId: id } satisfies OutboxJob);
    return id;
  }

  /** Dipanggil konsumen worker; percobaan gagal tetap dihitung lalu error diteruskan ke retry pg-boss. */
  async dispatch(job: OutboxJob): Promise<void> {
    try {
      await this.db.withSystemTx(job.tenantId, async (tx) => {
        const row = await this.events.lock(tx, job.eventId);
        if (!row || row.publishedAt) return;
        const event: OutboxEvent = {
          tenantId: row.tenantId,
          eventType: row.eventType,
          aggregateId: row.aggregateId,
          payload: payloadOf(row.payload),
        };
        for (const handler of this.handlers.get(row.eventType) ?? []) await handler(tx, event);
        await this.events.markPublished(tx, row.id);
      });
    } catch (error) {
      await this.db.withSystemTx(job.tenantId, (tx) => this.events.countAttempt(tx, job.eventId));
      throw error;
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function payloadOf(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Outbox payload must be a JSON object");
  return value;
}
