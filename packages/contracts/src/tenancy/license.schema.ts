import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { moduleCodeSchema } from "../common/modules.js";
import { businessDate, timestamp } from "../common/scalars.js";

export const deploymentTypeSchema = z.enum(["SAAS", "ON_PREMISE"]);
export type DeploymentType = z.infer<typeof deploymentTypeSchema>;

/**
 * Isi lisensi yang ditandatangani (technical-specs 07 §7.6). Field asing ditolak agar isi yang diverifikasi sama
 * persis dengan isi file. CORE wajib ada karena paket tanpa CORE tidak bisa berjalan (PK-01).
 */
export const licensePayloadSchema = z
  .strictObject({
    licenseNumber: z.string().min(1).max(50),
    companyCode: z.string().regex(/^[0-9]{3}$/),
    deploymentType: deploymentTypeSchema,
    modules: z
      .array(moduleCodeSchema)
      .refine((modules) => modules.includes("CORE"), "Modules must include CORE")
      .refine((modules) => new Set(modules).size === modules.length, "Modules must be unique"),
    validFrom: businessDate,
    validTo: businessDate,
    /** Disimpan tanpa ditegakkan (TO-04). */
    maxUsers: z.number().int().positive().nullable(),
  })
  .refine((license) => license.validFrom <= license.validTo, {
    path: ["validTo"],
    message: "validTo must be on or after validFrom",
  });
export type LicensePayload = z.infer<typeof licensePayloadSchema>;

/** File lisensi dari `tools/license-cli`: isi lisensi dan tanda tangan Ed25519 base64 atas isi kanoniknya. */
export const licenseFileSchema = z.strictObject({
  license: licensePayloadSchema,
  signature: z.base64(),
});
export type LicenseFile = z.infer<typeof licenseFileSchema>;

/**
 * Bentuk kanonik yang ditandatangani penerbit dan diverifikasi aplikasi: JSON tanpa spasi dengan urutan kunci
 * alfabetis. Penerbit dan pemeriksa memakai fungsi yang sama, jadi urutan kunci di file tidak berpengaruh.
 */
export function canonicalLicensePayload(license: LicensePayload): string {
  return JSON.stringify({
    companyCode: license.companyCode,
    deploymentType: license.deploymentType,
    licenseNumber: license.licenseNumber,
    maxUsers: license.maxUsers,
    modules: license.modules,
    validFrom: license.validFrom,
    validTo: license.validTo,
  });
}

/** `EXPIRED` dihitung saat dibaca bila `validTo` sudah lewat; aplikasi masuk mode baca saja (LC-06). */
export const licenseStatusSchema = z.enum(["ACTIVE", "EXPIRED"]);
export type LicenseStatus = z.infer<typeof licenseStatusSchema>;

/** `GET /license` (api-specs 04 §4.1). */
export const licenseResponseSchema = dataEnvelope(
  z.object({
    licenseNumber: z.string(),
    companyCode: z.string(),
    deploymentType: deploymentTypeSchema,
    validFrom: businessDate,
    validTo: businessDate,
    status: licenseStatusSchema,
    maxUsers: z.number().int().nullable(),
    modules: z.array(z.object({ moduleCode: moduleCodeSchema, moduleName: z.string() })),
    installedAt: timestamp,
  }),
);
export type LicenseResponse = z.infer<typeof licenseResponseSchema>;

/** `POST /license` (api-specs 04 §4.2). `modulesNotInPackage`: modul berlisensi yang tidak ada di image (PK-02). */
export const licenseInstallResponseSchema = dataEnvelope(
  z.object({
    licenseNumber: z.string(),
    validTo: businessDate,
    modules: z.array(moduleCodeSchema),
    modulesNotInPackage: z.array(moduleCodeSchema),
  }),
);
export type LicenseInstallResponse = z.infer<typeof licenseInstallResponseSchema>;
