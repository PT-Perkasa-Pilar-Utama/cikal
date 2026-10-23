import fastifyMultipart from "@fastify/multipart";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { DomainError } from "./domain-error.js";

/**
 * Batas setiap request multipart. Berkas dibaca sebelum guard, jadi batasnya setara body JSON: satu berkas sebesar
 * `bodyLimit` dan sedikit field kecil. Rute menurunkan `fileSize` lewat `@RouteConfig({ multipartOptions })`.
 */
const UPLOAD_LIMITS = { files: 1, fields: 10, fieldSize: 64 * 1024, parts: 11 };

/**
 * Satu berkas `multipart/form-data` yang sudah dibaca. `truncated` berarti berkas melebihi `fileSize` rute;
 * penerimanya menolak berkas itu dengan kode error resource-nya sendiri.
 */
export const uploadedFileSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  data: z.instanceof(Buffer),
  truncated: z.boolean(),
});
export type UploadedFile = z.infer<typeof uploadedFileSchema>;

/** Body rute unggah satu berkas di field `file` (contoh api-specs 04 §4.2). */
export const fileUploadSchema = z.object({ file: uploadedFileSchema });

/**
 * Berkas menjadi `request.body` sebelum guard dan pipe, sehingga DTO dan hash `Idempotency-Key` ikut memuat isinya.
 * Field teks diabaikan. Body multipart yang rusak atau melewati batas dijawab `400 VALIDATION_FAILED`.
 */
async function readUploadedFiles(request: FastifyRequest): Promise<void> {
  if (!request.isMultipart()) return;
  const body: Record<string, UploadedFile> = {};
  try {
    for await (const part of request.parts(request.routeOptions.config.multipartOptions)) {
      if (part.type !== "file") continue;
      const data = await part.toBuffer();
      body[part.fieldname] = { filename: part.filename, mimetype: part.mimetype, data, truncated: part.file.truncated };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw DomainError.standard("VALIDATION_FAILED", undefined, [{ field: "file", code: "invalid_multipart", message }]);
  }
  request.body = body;
}

/** Parser `multipart/form-data` untuk rute unggah (contoh `POST /license`, api-specs 04 §4.2). */
export async function registerMultipart(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyMultipart, { throwFileSizeLimit: false, limits: UPLOAD_LIMITS });
  app.getHttpAdapter().getInstance().addHook("preValidation", readUploadedFiles);
}
