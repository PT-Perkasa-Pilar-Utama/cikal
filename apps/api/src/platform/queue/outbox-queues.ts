import { z } from "zod";
import type { QueueDefinition } from "./queue-definition.js";

/** Satu job per event outbox (technical-specs 05 §5.0.1 `publish`). */
export const OUTBOX_QUEUE = "platform.outbox";

/** Handler gagal dicoba ulang; at-least-once sehingga handler wajib idempotent. */
export const outboxQueues: readonly QueueDefinition[] = [
  { name: OUTBOX_QUEUE, policy: "standard", retryLimit: 5, retryDelay: 30, retryBackoff: true, expireInSeconds: 300 },
];

export const outboxJobSchema = z.object({ tenantId: z.uuid(), eventId: z.uuid() });
export type OutboxJob = z.infer<typeof outboxJobSchema>;
