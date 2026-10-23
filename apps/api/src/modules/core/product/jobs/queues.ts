import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Versi rute yang disetujui dengan `effectiveFrom` nanti menjadi ACTIVE saat waktunya tiba (technical-specs 06 §6.13). */
export const ROUTE_ACTIVATION_QUEUE = "product.route-activate";

export const productQueues: readonly QueueDefinition[] = [
  { name: ROUTE_ACTIVATION_QUEUE, policy: "standard", retryLimit: 3, retryDelay: 30, retryBackoff: true },
];

export const routeActivationJobSchema = z.object({ tenantId: z.uuid(), versionId: z.uuid() });
