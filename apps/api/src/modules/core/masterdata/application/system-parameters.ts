import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { SystemParameterKey, SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { SystemParametersRepository } from "../db/system-parameters.repository.js";

/** Nilai `MULTI_CHOICE` disimpan sebagai larik JSON, contoh `["005"]` (technical-specs 06 §6.6). */
const CHOICES = z.array(z.string());

/**
 * Parameter sistem untuk modul lain lewat `SYSTEM_PARAMETER_PORT` (technical-specs 05 §5.4), dibaca di transaksi
 * pemanggil sehingga RLS memilih nilai tenant yang benar.
 */
@Injectable()
export class SystemParameters implements SystemParameterPort {
  constructor(private readonly parameters: SystemParametersRepository) {}

  async value(tx: Tx, key: SystemParameterKey, productId?: string): Promise<string | null> {
    const found = await this.parameters.lookup(tx, key, productId ?? null);
    // Kunci di tipe `SystemParameterKey` wajib punya definisi hasil seed `base`; tanpa itu instalasi rusak.
    if (!found) throw new Error(`System parameter ${key} is not defined`);
    return found.value === undefined ? found.defaultValue : found.value;
  }

  async flag(tx: Tx, key: SystemParameterKey, productId?: string): Promise<boolean> {
    const value = await this.value(tx, key, productId);
    if (value === null || value === "false") return false;
    if (value === "true") return true;
    throw new Error(`System parameter ${key} must be true or false, got ${value}`);
  }

  async choices(tx: Tx, key: SystemParameterKey, productId?: string): Promise<string[]> {
    const value = await this.value(tx, key, productId);
    if (value === null) return [];
    const parsed = CHOICES.safeParse(JSON.parse(value));
    if (!parsed.success) throw new Error(`System parameter ${key} must be a JSON array of text, got ${value}`);
    return parsed.data;
  }

  async snapshotLocked(tx: Tx, productId: string): Promise<Record<string, string>> {
    const definitions = await this.parameters.listLockedDefinitions(tx);
    const values = await this.parameters.listActiveValues(
      tx,
      definitions.map((definition) => definition.id),
      productId,
    );
    const snapshot: Record<string, string> = {};
    for (const definition of definitions) {
      const own = values.filter((row) => row.definitionId === definition.id);
      const chosen = own.find((row) => row.productId !== null) ?? own.find((row) => row.productId === null);
      const value = chosen ? chosen.value : definition.defaultValue;
      if (value !== null) snapshot[definition.paramKey] = value;
    }
    return snapshot;
  }
}
