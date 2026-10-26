import { Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { levels } from "./schema.js";

/** Rentang dan flag aksi satu level untuk routing dan tombol keputusan (RM-06, AC-73.03). */
export interface LevelRow {
  jobLevel: number;
  description: string;
  amountBegin: string;
  amountEnd: string;
  isApprove: boolean;
  isReject: boolean;
  isReturn: boolean;
  isFinalApprover: boolean;
}

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

  /** Semua level satu cabang dan produk, level terendah (nomor terbesar) lebih dulu. */
  async listFor(tx: Tx, branchId: string, productId: string): Promise<LevelRow[]> {
    return tx
      .select({
        jobLevel: levels.jobLevel,
        description: levels.description,
        amountBegin: levels.amountBegin,
        amountEnd: levels.amountEnd,
        isApprove: levels.isApprove,
        isReject: levels.isReject,
        isReturn: levels.isReturn,
        isFinalApprover: levels.isFinalApprover,
      })
      .from(levels)
      .where(and(eq(levels.branchId, branchId), eq(levels.productId, productId)))
      .orderBy(desc(levels.jobLevel));
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
