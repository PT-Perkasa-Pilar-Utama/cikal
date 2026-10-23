import type { AdapterErrorCategory } from "@cikal/contracts";
import type { RegionSnapshot } from "../domain/region-snapshot.js";

/** Seam data wilayah (technical-specs 05 §5.4): adapter Oksara atau adapter simulasi. */
export interface RegionDataPort {
  /** Seluruh data wilayah penyedia; gagal dengan `RegionSourceError`. */
  fetchAll(): Promise<RegionSnapshot>;
}

export const REGION_DATA_PORT = Symbol("REGION_DATA_PORT");

/** Kegagalan penyedia data wilayah dengan kategori IN-07 (technical-specs 13 §13.2). */
export class RegionSourceError extends Error {
  constructor(
    readonly category: AdapterErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = "RegionSourceError";
  }
}
