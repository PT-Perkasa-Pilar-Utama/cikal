import { Injectable } from "@nestjs/common";
import { asc } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { FieldSettings, MatrixRow } from "../domain/dedup-types.js";
import { dedupFieldSettings, dedupMatrix } from "./schema.js";

/** Akses konfigurasi `m06_dedup.dedup_matrix` dan `dedup_field_settings` (technical-specs 06 §6.11 M06). */
@Injectable()
export class DedupConfigRepository {
  async matrix(tx: Tx): Promise<MatrixRow[]> {
    return tx
      .select({
        id: dedupMatrix.id,
        priority: dedupMatrix.priority,
        nik: dedupMatrix.nik,
        fullNameId: dedupMatrix.fullNameId,
        dob: dedupMatrix.dob,
        pob: dedupMatrix.pob,
        motherMaidenName: dedupMatrix.motherMaidenName,
        dedupOutcome: dedupMatrix.dedupOutcome,
      })
      .from(dedupMatrix)
      .orderBy(asc(dedupMatrix.priority), asc(dedupMatrix.id));
  }

  /** Tiap field nama wajib punya pengaturan; `null` bila salah satunya belum diisi (konfigurasi, bukan data). */
  async fieldSettings(tx: Tx): Promise<FieldSettings | null> {
    const rows = await tx
      .select({
        fieldCode: dedupFieldSettings.fieldCode,
        algorithm: dedupFieldSettings.algorithm,
        fuzzyThreshold: dedupFieldSettings.fuzzyThreshold,
      })
      .from(dedupFieldSettings);
    const fullNameId = rows.find((setting) => setting.fieldCode === "FULL_NAME_ID");
    const motherMaidenName = rows.find((setting) => setting.fieldCode === "MOTHER_MAIDEN_NAME");
    return fullNameId && motherMaidenName ? { fullNameId, motherMaidenName } : null;
  }
}
