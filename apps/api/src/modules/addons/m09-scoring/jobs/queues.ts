import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Versi model yang disetujui dengan `effectiveFrom` nanti menjadi ACTIVE saat waktunya tiba (technical-specs 06 §6.13). */
export const MODEL_ACTIVATION_QUEUE = "m09-scoring.model-activate";

export const m09Queues: readonly QueueDefinition[] = [
  { name: MODEL_ACTIVATION_QUEUE, policy: "standard", retryLimit: 3, retryDelay: 30, retryBackoff: true },
];

export const modelActivationJobSchema = z.object({ tenantId: z.uuid(), modelId: z.uuid() });
