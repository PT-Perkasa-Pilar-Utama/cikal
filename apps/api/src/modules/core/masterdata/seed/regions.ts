import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { SIMULATION_REGIONS } from "../adapters/simulation-region.adapter.js";
import { cities, districts, provinces, subDistricts } from "../db/schema.js";
import { parentOf, zipOf } from "../domain/region-snapshot.js";

const SEEDED_AT = new Date("2026-01-01T00:00:00Z");

/**
 * Data wilayah simulasi untuk seed `dev` dan `qa`, agar dropdown alamat bisa dipakai tanpa Oksara. Production
 * mengisi data wilayah lewat "Sync Region Data" (api-specs 06 §6.3.3).
 */
export async function seedRegions(db: NodePgDatabase): Promise<void> {
  const { province, city, district, subDistrict } = SIMULATION_REGIONS;
  await db
    .insert(provinces)
    .values(province.map((e) => ({ id: uuidv7(), provinceCode: e.code, provinceName: e.name, lastSyncAt: SEEDED_AT })))
    .onConflictDoNothing();
  await db
    .insert(cities)
    .values(
      city.map((e) => ({
        id: uuidv7(),
        cityCode: e.code,
        cityName: e.name,
        provinceCode: parentOf(e),
        lastSyncAt: SEEDED_AT,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(districts)
    .values(
      district.map((e) => ({
        id: uuidv7(),
        districtCode: e.code,
        districtName: e.name,
        cityCode: parentOf(e),
        lastSyncAt: SEEDED_AT,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(subDistricts)
    .values(
      subDistrict.map((e) => ({
        id: uuidv7(),
        subDistrictCode: e.code,
        subDistrictName: e.name,
        districtCode: parentOf(e),
        zipCode: zipOf(e),
        lastSyncAt: SEEDED_AT,
      })),
    )
    .onConflictDoNothing();
}
