import { ilike, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/** Lingkup data user (technical-specs 09 §9.4): unit kerja kosong = role pusat yang melihat semua unit. */
export interface UnitScope {
  regionalId: string | null;
  branchId: string | null;
}

export interface UnitPage {
  offset: number;
  limit: number;
  direction: "asc" | "desc";
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Kode atau nama unit memuat `q` (api-specs 05 §5.1). */
export function codeOrName(code: AnyPgColumn, name: AnyPgColumn, q: string | undefined): SQL | undefined {
  if (q === undefined) return undefined;
  const pattern = `%${escapeLike(q)}%`;
  return or(ilike(code, pattern), ilike(name, pattern));
}
