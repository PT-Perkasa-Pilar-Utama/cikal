import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { levels } from "./schema.js";

export interface LevelKey {
  branchId: string;
  productId: string;
  jobLevel: number;
}

/** Akses tabel `approval.levels` (technical-specs 06 §6.10). */
@Injectable()
export class LevelsRepository {
  async findDescription(tx: Tx, key: LevelKey): Promise<string | null> {
    const [row] = await tx
      .select({ description: levels.description })
      .from(levels)
      .where(
        and(eq(levels.branchId, key.branchId), eq(levels.productId, key.productId), eq(levels.jobLevel, key.jobLevel)),
      );
    return row?.description ?? null;
  }

  /** Deskripsi level per `branchId:productId:jobLevel`, untuk kolom "Level" daftar hierarki. */
  async descriptions(tx: Tx): Promise<Map<string, string>> {
    const rows = await tx
      .select({
        branchId: levels.branchId,
        productId: levels.productId,
        jobLevel: levels.jobLevel,
        description: levels.description,
      })
      .from(levels);
    return new Map(rows.map((row) => [levelKeyOf(row), row.description]));
  }
}

export const levelKeyOf = (key: LevelKey): string => `${key.branchId}:${key.productId}:${key.jobLevel}`;
