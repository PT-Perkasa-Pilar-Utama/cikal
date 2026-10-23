import type { RegionOption, RegionSearchItem, SubDistrictOption } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { cities, districts, provinces, subDistricts } from "./schema.js";

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);
const contains = (column: AnyPgColumn, q: string) => ilike(column, `%${escapeLike(q)}%`);
const nameFilter = (column: AnyPgColumn, q: string | undefined) => (q ? contains(column, q) : undefined);

export interface SearchPage {
  offset: number;
  limit: number;
}

/** Dropdown berjenjang dan pencarian wilayah (api-specs 06 §6.3.1, §6.3.2). */
@Injectable()
export class RegionsRepository {
  async provinces(tx: Tx, q: string | undefined): Promise<RegionOption[]> {
    return tx
      .select({ code: provinces.provinceCode, name: provinces.provinceName, parentCode: sql<null>`null` })
      .from(provinces)
      .where(nameFilter(provinces.provinceName, q))
      .orderBy(asc(provinces.provinceName));
  }

  async cities(tx: Tx, provinceCode: string, q: string | undefined): Promise<RegionOption[]> {
    return tx
      .select({ code: cities.cityCode, name: cities.cityName, parentCode: cities.provinceCode })
      .from(cities)
      .where(and(eq(cities.provinceCode, provinceCode), nameFilter(cities.cityName, q)))
      .orderBy(asc(cities.cityName));
  }

  async districts(tx: Tx, cityCode: string, q: string | undefined): Promise<RegionOption[]> {
    return tx
      .select({ code: districts.districtCode, name: districts.districtName, parentCode: districts.cityCode })
      .from(districts)
      .where(and(eq(districts.cityCode, cityCode), nameFilter(districts.districtName, q)))
      .orderBy(asc(districts.districtName));
  }

  async subDistricts(tx: Tx, districtCode: string, q: string | undefined): Promise<SubDistrictOption[]> {
    return tx
      .select({
        code: subDistricts.subDistrictCode,
        name: subDistricts.subDistrictName,
        parentCode: subDistricts.districtCode,
        zipCode: subDistricts.zipCode,
      })
      .from(subDistricts)
      .where(and(eq(subDistricts.districtCode, districtCode), nameFilter(subDistricts.subDistrictName, q)))
      .orderBy(asc(subDistricts.subDistrictName));
  }

  /** Kelurahan yang provinsi, kota, kecamatan, kelurahan, atau kode posnya memuat `q` (AC-23.03). */
  async search(tx: Tx, q: string, page: SearchPage): Promise<RegionSearchItem[]> {
    return tx
      .select({
        provinceCode: provinces.provinceCode,
        provinceName: provinces.provinceName,
        cityCode: cities.cityCode,
        cityName: cities.cityName,
        districtCode: districts.districtCode,
        districtName: districts.districtName,
        subDistrictCode: subDistricts.subDistrictCode,
        subDistrictName: subDistricts.subDistrictName,
        zipCode: subDistricts.zipCode,
      })
      .from(subDistricts)
      .innerJoin(districts, eq(districts.districtCode, subDistricts.districtCode))
      .innerJoin(cities, eq(cities.cityCode, districts.cityCode))
      .innerJoin(provinces, eq(provinces.provinceCode, cities.provinceCode))
      .where(this.matches(q))
      .orderBy(asc(subDistricts.subDistrictCode))
      .offset(page.offset)
      .limit(page.limit);
  }

  async countSearch(tx: Tx, q: string): Promise<number> {
    const [row] = await tx
      .select({ total: count() })
      .from(subDistricts)
      .innerJoin(districts, eq(districts.districtCode, subDistricts.districtCode))
      .innerJoin(cities, eq(cities.cityCode, districts.cityCode))
      .innerJoin(provinces, eq(provinces.provinceCode, cities.provinceCode))
      .where(this.matches(q));
    return row?.total ?? 0;
  }

  private matches(q: string): SQL | undefined {
    return or(
      contains(provinces.provinceName, q),
      contains(cities.cityName, q),
      contains(districts.districtName, q),
      contains(subDistricts.subDistrictName, q),
      contains(subDistricts.zipCode, q),
    );
  }
}
