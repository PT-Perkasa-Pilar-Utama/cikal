import { z } from "zod";
import { id } from "../common/scalars.js";
import { stepStatusSchema } from "./step.js";

/** Query endpoint hasil langkah per pengajuan; tanpa `processInstanceId` dipakai proses terbaru (api-specs 19 s.d. 23). */
export const stepResultQuerySchema = z.object({ processInstanceId: id.optional() });
export type StepResultQuery = z.infer<typeof stepResultQuerySchema>;

/**
 * Respons hasil satu langkah. Langkah yang belum berjalan atau dilewati menjawab `200` dengan `data: null` dan
 * `meta.stepStatus` (api-specs 19 §19.2), supaya timeline tetap bisa menampilkan statusnya.
 */
export const stepResultEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({
    data: data.nullable(),
    meta: z.object({ stepStatus: stepStatusSchema }).optional(),
  });
