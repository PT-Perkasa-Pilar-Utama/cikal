import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { parentOf, type RegionEntry, type RegionSnapshot, zipOf } from "../domain/region-snapshot.js";
import { cities, districts, provinces, subDistricts } from "./schema.js";

/** Baris per `INSERT`; 1.000 baris x 7 kolom jauh di bawah batas 65.535 parameter PostgreSQL. */
const BATCH_SIZE = 1_000;

function* batches(rows: readonly RegionEntry[]): Generator<RegionEntry[]> {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) yield rows.slice(start, start + BATCH_SIZE);
}

/** Seluruh data wilayah lokal dan penulisan hasil sinkronisasi (technical-specs 06 §6.6). */
@Injectable()
export class RegionSnapshotsRepository {
  async load(tx: Tx): Promise<RegionSnapshot> {
    const none = sql<null>`null`;
    return {
      province: await tx
        .select({ code: provinces.provinceCode, name: provinces.provinceName, parentCode: none, zipCode: none })
        .from(provinces),
      city: await tx
        .select({ code: cities.cityCode, name: cities.cityName, parentCode: cities.provinceCode, zipCode: none })
        .from(cities),
      district: await tx
        .select({
          code: districts.districtCode,
          name: districts.districtName,
          parentCode: districts.cityCode,
          zipCode: none,
        })
        .from(districts),
      subDistrict: await tx
        .select({
          code: subDistricts.subDistrictCode,
          name: subDistricts.subDistrictName,
          parentCode: subDistricts.districtCode,
          zipCode: subDistricts.zipCode,
        })
        .from(subDistricts),
    };
  }

  /**
   * Menulis seluruh snapshot dari provinsi ke kelurahan (urutan foreign key). Baris yang sudah ada ikut ditulis
   * agar kolom "Last Sync" berisi waktu sinkronisasi ini (AC-23.01). Baris yang hilang di penyedia dibiarkan,
   * karena kodenya mungkin dipakai alamat pengajuan.
   */
  async write(tx: Tx, snapshot: RegionSnapshot, syncedAt: Date): Promise<void> {
    const stamp = { lastSyncAt: syncedAt, updatedAt: syncedAt };
    for (const batch of batches(snapshot.province)) {
      await tx
        .insert(provinces)
        .values(batch.map((e) => ({ id: uuidv7(), provinceCode: e.code, provinceName: e.name, lastSyncAt: syncedAt })))
        .onConflictDoUpdate({
          target: provinces.provinceCode,
          set: { provinceName: sql`excluded.province_name`, ...stamp },
        });
    }
    for (const batch of batches(snapshot.city)) {
      await tx
        .insert(cities)
        .values(
          batch.map((e) => ({
            id: uuidv7(),
            cityCode: e.code,
            cityName: e.name,
            provinceCode: parentOf(e),
            lastSyncAt: syncedAt,
          })),
        )
        .onConflictDoUpdate({
          target: cities.cityCode,
          set: { cityName: sql`excluded.city_name`, provinceCode: sql`excluded.province_code`, ...stamp },
        });
    }
    for (const batch of batches(snapshot.district)) {
      await tx
        .insert(districts)
        .values(
          batch.map((e) => ({
            id: uuidv7(),
            districtCode: e.code,
            districtName: e.name,
            cityCode: parentOf(e),
            lastSyncAt: syncedAt,
          })),
        )
        .onConflictDoUpdate({
          target: districts.districtCode,
          set: { districtName: sql`excluded.district_name`, cityCode: sql`excluded.city_code`, ...stamp },
        });
    }
    for (const batch of batches(snapshot.subDistrict)) {
      await tx
        .insert(subDistricts)
        .values(
          batch.map((e) => ({
            id: uuidv7(),
            subDistrictCode: e.code,
            subDistrictName: e.name,
            districtCode: parentOf(e),
            zipCode: zipOf(e),
            lastSyncAt: syncedAt,
          })),
        )
        .onConflictDoUpdate({
          target: subDistricts.subDistrictCode,
          set: {
            subDistrictName: sql`excluded.sub_district_name`,
            districtCode: sql`excluded.district_code`,
            zipCode: sql`excluded.zip_code`,
            ...stamp,
          },
        });
    }
  }
}
