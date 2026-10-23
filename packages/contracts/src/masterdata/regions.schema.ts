import { z } from "zod";
import { dataEnvelope, pageMetaSchema } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";
import { adapterErrorCategories } from "../integration/adapter.js";

/** Pesan hasil sinkronisasi wilayah (AC-23.01, AC-23.02). */
export const regionSyncCompletedMessage = (added: number, updated: number): string =>
  `Region sync completed: ${added} added, ${updated} updated`;
export const REGION_SYNC_FAILED_MESSAGE = "Region sync failed. Existing data is unchanged";

const nameFilter = z.string().trim().min(1).max(100).optional();
const parentCode = z.string().trim().min(1).max(20);

/** Query `GET /regions/provinces` (api-specs 06 §6.3.1). */
export const provinceOptionsQuerySchema = z.object({ q: nameFilter });
export type ProvinceOptionsQuery = z.infer<typeof provinceOptionsQuerySchema>;

/** Query `GET /regions/cities`: kota dalam satu provinsi (AC-23.04). */
export const cityOptionsQuerySchema = z.object({ provinceCode: parentCode, q: nameFilter });
export type CityOptionsQuery = z.infer<typeof cityOptionsQuerySchema>;

/** Query `GET /regions/districts`. */
export const districtOptionsQuerySchema = z.object({ cityCode: parentCode, q: nameFilter });
export type DistrictOptionsQuery = z.infer<typeof districtOptionsQuerySchema>;

/** Query `GET /regions/sub-districts`. */
export const subDistrictOptionsQuerySchema = z.object({ districtCode: parentCode, q: nameFilter });
export type SubDistrictOptionsQuery = z.infer<typeof subDistrictOptionsQuerySchema>;

export const regionOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** `null` untuk provinsi. */
  parentCode: z.string().nullable(),
});
export type RegionOption = z.infer<typeof regionOptionSchema>;

export const subDistrictOptionSchema = regionOptionSchema.extend({ zipCode: z.string() });
export type SubDistrictOption = z.infer<typeof subDistrictOptionSchema>;

/** Dropdown Province, City, District (api-specs 06 §6.3.1). */
export const regionOptionsResponseSchema = dataEnvelope(z.array(regionOptionSchema));
export type RegionOptionsResponse = z.infer<typeof regionOptionsResponseSchema>;

/** Dropdown Sub District dengan kode pos. */
export const subDistrictOptionsResponseSchema = dataEnvelope(z.array(subDistrictOptionSchema));
export type SubDistrictOptionsResponse = z.infer<typeof subDistrictOptionsResponseSchema>;

/** Query `GET /regions/search` (api-specs 06 §6.3.2). */
export const regionSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(100),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type RegionSearchQuery = z.infer<typeof regionSearchQuerySchema>;

export const regionSearchItemSchema = z.object({
  provinceCode: z.string(),
  provinceName: z.string(),
  cityCode: z.string(),
  cityName: z.string(),
  districtCode: z.string(),
  districtName: z.string(),
  subDistrictCode: z.string(),
  subDistrictName: z.string(),
  zipCode: z.string(),
});
export type RegionSearchItem = z.infer<typeof regionSearchItemSchema>;

/** Hasil pencarian wilayah; `lastSyncAt` dari sinkronisasi terakhir yang selesai (AC-23.01). */
export const regionSearchResponseSchema = z.object({
  data: z.array(regionSearchItemSchema),
  meta: pageMetaSchema.extend({ lastSyncAt: timestamp.nullable() }),
});
export type RegionSearchResponse = z.infer<typeof regionSearchResponseSchema>;

export const regionSyncStatusSchema = z.enum(["RUNNING", "COMPLETED", "FAILED"]);
export type RegionSyncStatus = z.infer<typeof regionSyncStatusSchema>;

/** Respons 202 `POST /regions/sync` (api-specs 06 §6.3.3). */
export const regionSyncStartedResponseSchema = dataEnvelope(
  z.object({ syncId: id, status: z.literal("RUNNING"), startedAt: timestamp }),
);
export type RegionSyncStartedResponse = z.infer<typeof regionSyncStartedResponseSchema>;

/** Status sinkronisasi untuk polling klien (api-specs 06 §6.3.4). */
export const regionSyncStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("RUNNING") }),
  z.object({
    status: z.literal("COMPLETED"),
    added: z.number().int().min(0),
    updated: z.number().int().min(0),
    finishedAt: timestamp,
    lastSyncAt: timestamp,
  }),
  /** `errorCategory` kosong bila kegagalan bukan dari penyedia. */
  z.object({ status: z.literal("FAILED"), errorCategory: z.enum(adapterErrorCategories).nullable() }),
]);
export type RegionSyncState = z.infer<typeof regionSyncStateSchema>;

export const regionSyncStateResponseSchema = dataEnvelope(regionSyncStateSchema);
export type RegionSyncStateResponse = z.infer<typeof regionSyncStateResponseSchema>;
