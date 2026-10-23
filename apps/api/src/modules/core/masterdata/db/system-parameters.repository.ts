import { Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { SystemParameterKey } from "../../../../platform/http/system-parameter-port.js";
import { systemParameterDefinitions, systemParameterValues } from "./schema.js";

export interface LockedDefinition {
  id: string;
  paramKey: string;
  defaultValue: string | null;
}

export interface ActiveValue {
  definitionId: string;
  /** `null` untuk nilai tenant. */
  productId: string | null;
  value: string | null;
}

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

  /** Definisi bertanda `lock_on_submit` (PR-06). */
  async listLockedDefinitions(tx: Tx): Promise<LockedDefinition[]> {
    return tx
      .select({
        id: systemParameterDefinitions.id,
        paramKey: systemParameterDefinitions.paramKey,
        defaultValue: systemParameterDefinitions.defaultValue,
      })
      .from(systemParameterDefinitions)
      .where(eq(systemParameterDefinitions.lockOnSubmit, true));
  }

  /** Nilai ACTIVE yang sudah berlaku untuk produk dan tenant; satu baris per definisi dan produk (DM-11). */
  async listActiveValues(tx: Tx, definitionIds: readonly string[], productId: string): Promise<ActiveValue[]> {
    if (definitionIds.length === 0) return [];
    const values = systemParameterValues;
    return tx
      .select({ definitionId: values.definitionId, productId: values.productId, value: values.value })
      .from(values)
      .where(
        and(
          inArray(values.definitionId, [...definitionIds]),
          eq(values.status, "ACTIVE"),
          lte(values.effectiveFrom, sql`now()`),
          or(eq(values.productId, productId), isNull(values.productId)),
        ),
      );
  }
}
