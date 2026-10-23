import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { timestamp } from "../common/scalars.js";

/** Query `GET /files/{fileId}/download-url` (api-specs 10 §10.1). */
export const fileDownloadQuerySchema = z.object({
  disposition: z.enum(["inline", "attachment"]).default("inline"),
});
export type FileDownloadQuery = z.infer<typeof fileDownloadQuerySchema>;

/** URL bertanda tangan S3 berumur 5 menit; file selalu PDF (DC-02). */
export const fileDownloadUrlResponseSchema = dataEnvelope(
  z.object({
    url: z.url(),
    expiresAt: timestamp,
    fileName: z.string(),
    contentType: z.literal("application/pdf"),
    sizeBytes: z.number().int().positive(),
  }),
);
export type FileDownloadUrlResponse = z.infer<typeof fileDownloadUrlResponseSchema>;
