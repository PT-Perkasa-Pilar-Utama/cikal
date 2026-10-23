import type { ModuleCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { moduleEntitlements } from "./schema.js";

/** Akses tabel `tenancy.module_entitlements` (technical-specs 06 §6.5). */
@Injectable()
export class ModuleEntitlementsRepository {
  async insert(
    tx: Tx,
    entitlement: { tenantId: string; licenseId: string; createdBy: string },
    modules: readonly ModuleCode[],
  ): Promise<void> {
    await tx
      .insert(moduleEntitlements)
      .values(
        modules.map((moduleCode) => ({ id: uuidv7(), ...entitlement, moduleCode, updatedBy: entitlement.createdBy })),
      );
  }
}
