import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Format nomor yang disetujui dengan `effectiveFrom` nanti menjadi ACTIVE saat waktunya tiba (technical-specs 06 §6.13). */
export const NUMBER_FORMAT_ACTIVATION_QUEUE = "document.number-format-activate";

export const documentQueues: readonly QueueDefinition[] = [
  { name: NUMBER_FORMAT_ACTIVATION_QUEUE, policy: "standard", retryLimit: 3, retryDelay: 30, retryBackoff: true },
];

export const numberFormatActivationJobSchema = z.object({ tenantId: z.uuid(), formatId: z.uuid() });
