import type { ModuleCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { integrationConfigs } from "./schema.js";

export type ConfigRow = Pick<
  typeof integrationConfigs.$inferSelect,
  | "tenantId"
  | "moduleCode"
  | "providerCode"
  | "mode"
  | "endpointUrl"
  | "timeoutSeconds"
  | "maxRetries"
  | "asyncWaitHours"
  | "settings"
>;

const configColumns = {
  tenantId: integrationConfigs.tenantId,
  moduleCode: integrationConfigs.moduleCode,
  providerCode: integrationConfigs.providerCode,
  mode: integrationConfigs.mode,
  endpointUrl: integrationConfigs.endpointUrl,
  timeoutSeconds: integrationConfigs.timeoutSeconds,
  maxRetries: integrationConfigs.maxRetries,
  asyncWaitHours: integrationConfigs.asyncWaitHours,
  settings: integrationConfigs.settings,
};

/** Akses tabel `integration.integration_configs` (data dictionary IntegrationConfig). */
@Injectable()
export class IntegrationConfigsRepository {
  /** Konfigurasi ACTIVE modul di tenant transaksi; `providerCode` memilih satu baris M14. */
  async findActive(tx: Tx, moduleCode: ModuleCode, providerCode?: string): Promise<ConfigRow | null> {
    const [row] = await tx
      .select(configColumns)
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.moduleCode, moduleCode),
          eq(integrationConfigs.status, "ACTIVE"),
          providerCode ? eq(integrationConfigs.providerCode, providerCode) : undefined,
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
