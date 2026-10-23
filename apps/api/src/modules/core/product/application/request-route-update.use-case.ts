import type { ChangeRequestAccepted, ProductRouteUpdateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { ProductsRepository } from "../db/products.repository.js";
import { RouteVersionsRepository } from "../db/route-versions.repository.js";
import { noRouteChangesError, sameRoute, toRouteChangeData } from "../domain/route-rules.js";
import { RouteChecks } from "./route-checks.js";

/**
 * Maker mengajukan versi rute baru lewat ChangeRequest `ROUTE` (api-specs 08 §8.9). Versi ACTIVE tetap dipakai
 * pengajuan baru sampai versi baru disetujui (AC-31.01).
 */
@Injectable()
export class RequestRouteUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly versions: RouteVersionsRepository,
    private readonly checks: RouteChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, productId: string, body: ProductRouteUpdateRequest): Promise<ChangeRequestAccepted> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, productId);
      if (!product) throw DomainError.standard("NOT_FOUND");
      const licensed = await this.checks.licensedModules(tx);
      this.checks.assertSteps(body.steps, licensed);
      const routeId = await this.versions.lockRoute(tx, productId, ctx);
      const history = await this.versions.listVersions(tx, productId);
      const active = history.find((version) => version.status === "ACTIVE");
      const activeSteps = active ? await this.versions.listSteps(tx, active.id) : null;
      if (activeSteps && sameRoute(body.steps, activeSteps, licensed)) throw noRouteChangesError();
      if (history.some((version) => version.status === "WAITING_APPROVAL")) {
        throw DomainError.standard("PENDING_CHANGE_REQUEST");
      }

      const draft = {
        id: uuidv7(),
        routeId,
        versionNumber: (history[0]?.versionNumber ?? 0) + 1,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      };
      await this.versions.insertDraft(tx, draft, body.steps, ctx);
      const accepted = await this.changeRequests.submit(tx, ctx, {
        entityType: "ROUTE",
        entityId: productId,
        oldData: active && activeSteps ? toRouteChangeData(product, active, activeSteps) : null,
        newData: toRouteChangeData(product, draft, body.steps),
      });
      await this.versions.setStatus(tx, draft.id, { status: "WAITING_APPROVAL" }, ctx.userId);
      return {
        data: { ...accepted.data, versionNumber: draft.versionNumber },
        message: `Route version ${draft.versionNumber} submitted for approval`,
      };
    });
  }
}
