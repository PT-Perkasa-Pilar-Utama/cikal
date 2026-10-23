import { z } from "zod";
import type { QueueDefinition } from "../../../../platform/queue/queue-definition.js";

/** Job gagal permanen (technical-specs 12 §12.5); tugas PROCESS_ERROR dari antrean ini dibuat di kartu BE-S2-02. */
export const DEAD_LETTER_QUEUE = "orchestrator.dead-letter";
/** Satu job per pengajuan per langkah (technical-specs 12 §12.1). */
export const ADVANCE_QUEUE = "orchestrator.advance";
/** Batas tunggu langkah WAITING_EXTERNAL (IN-08). */
export const WAIT_DEADLINE_QUEUE = "orchestrator.wait-deadline";

/** Retry job untuk kegagalan tak terduga, misalnya koneksi database putus; error langkah tidak memakai ini. */
const jobRetry = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 300,
  deadLetter: DEAD_LETTER_QUEUE,
};

export const orchestratorQueues: readonly QueueDefinition[] = [
  { name: DEAD_LETTER_QUEUE, policy: "standard" },
  { name: ADVANCE_QUEUE, policy: "standard", ...jobRetry },
  { name: WAIT_DEADLINE_QUEUE, policy: "standard", ...jobRetry },
];

/** Payload job hanya berisi id; tenant wajib ada (technical-specs 12 §12.5). */
export const advanceJobSchema = z.object({ tenantId: z.uuid(), processInstanceId: z.uuid() });
export const waitDeadlineJobSchema = z.object({ tenantId: z.uuid(), stepExecutionId: z.uuid() });
