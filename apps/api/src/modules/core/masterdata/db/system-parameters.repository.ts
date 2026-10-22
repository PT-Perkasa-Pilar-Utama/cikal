import { Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { SystemParameterKey } from "../../../../platform/http/system-parameter-port.js";
import { systemParameterDefinitions, systemParameterValues } from "./schema.js";

export interface ParameterLookup {
  defaultValue: string | null;
  /** Nilai ACTIVE yang sudah berlaku, produk lebih dulu dari tenant; `undefined` bila tidak ada. */
  value: string | null | undefined;
}

/** Akses tabel `masterdata.system_parameter_*` (technical-specs 06 §6.6). */
@Injectable()
export class SystemParametersRepository {
  /** `null` bila kunci tidak terdaftar di instalasi. */
  async lookup(tx: Tx, key: SystemParameterKey, productId: string | null): Promise<ParameterLookup | null> {
    const [definition] = await tx
      .select({ id: systemParameterDefinitions.id, defaultValue: systemParameterDefinitions.defaultValue })
      .from(systemParameterDefinitions)
      .where(eq(systemParameterDefinitions.paramKey, key));
    if (!definition) return null;

    const values = systemParameterValues;
    const [active] = await tx
      .select({ value: values.value })
      .from(values)
      .where(
        and(
          eq(values.definitionId, definition.id),
          eq(values.status, "ACTIVE"),
          lte(values.effectiveFrom, sql`now()`),
          productId ? or(eq(values.productId, productId), isNull(values.productId)) : isNull(values.productId),
        ),
      )
      .orderBy(sql`${values.productId} is null`, desc(values.effectiveFrom))
      .limit(1);
    return { defaultValue: definition.defaultValue, value: active?.value };
  }
}
