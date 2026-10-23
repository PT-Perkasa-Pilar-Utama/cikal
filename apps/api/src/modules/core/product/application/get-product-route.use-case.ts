import type { ProductRouteQuery, ProductRouteResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { RouteVersionsRepository } from "../db/route-versions.repository.js";
import { ROUTE_NOT_FOUND, routeEditorSteps } from "../domain/route-rules.js";
import { RouteChecks } from "./route-checks.js";

/**
 * Rute produk untuk editor rute (api-specs 08 §8.10). Tanpa `version` dipakai versi ACTIVE, atau versi terakhir bila
 * rute pertama produk belum disetujui.
 */
@Injectable()
export class GetProductRouteUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly versions: RouteVersionsRepository,
    private readonly checks: RouteChecks,
  ) {}

  execute(ctx: RequestContext, productId: string, query: ProductRouteQuery): Promise<ProductRouteResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const history = await this.versions.listVersions(tx, productId);
      const selected =
        query.version === undefined
          ? (history.find((version) => version.status === "ACTIVE") ?? history[0])
          : history.find((version) => version.versionNumber === query.version);
      if (!selected) throw DomainError.standard("NOT_FOUND", ROUTE_NOT_FOUND);
      const steps = await this.versions.listSteps(tx, selected.id);
      const pending = history.find((version) => version.status === "WAITING_APPROVAL");
      return {
        data: {
          productId,
          versionNumber: selected.versionNumber,
          status: selected.status,
          effectiveFrom: selected.effectiveFrom?.toISOString() ?? null,
          pendingVersionNumber: pending?.versionNumber ?? null,
          steps: routeEditorSteps(steps, await this.checks.licensedModules(tx)),
        },
      };
    });
  }
}
