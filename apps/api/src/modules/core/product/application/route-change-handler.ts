import { routeChangeDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { type RouteVersionDetail, RouteVersionsRepository } from "../db/route-versions.repository.js";
import { changedRouteSteps } from "../domain/route-rules.js";
import { RouteActivation } from "./route-activation.js";
import { RouteChecks } from "./route-checks.js";

/** Handler ChangeRequest `ROUTE` (api-specs 07 §7.1): versi rute produk (api-specs 08 §8.9). */
@Injectable()
export class RouteChangeHandler implements EntityHandler {
  readonly entityType = "ROUTE";
  readonly auditModule = "Product Route";

  constructor(
    private readonly versions: RouteVersionsRepository,
    private readonly checks: RouteChecks,
    private readonly activation: RouteActivation,
  ) {}

  displayName(newData: JsonRecord): string {
    return typeof newData.productName === "string" ? newData.productName : "";
  }

  diff(oldData: JsonRecord | null, newData: JsonRecord): string[] {
    const current = oldData ? routeChangeDataSchema.parse(oldData).steps : null;
    return changedRouteSteps(current, routeChangeDataSchema.parse(newData).steps);
  }

  /** Lisensi bisa berubah sejak diajukan, jadi langkah diperiksa ulang terhadap lisensi terkini. */
  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = routeChangeDataSchema.parse(request.newData);
    await this.waitingVersion(tx, data.versionId);
    this.checks.assertSteps(data.steps, await this.checks.licensedModules(tx));
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = routeChangeDataSchema.parse(request.newData);
    const version = await this.waitingVersion(tx, data.versionId);
    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
    await this.activation.approve(tx, version, effectiveFrom, reviewer);
    return { entityId: version.productId, versionNumber: version.versionNumber };
  }

  /** Versi yang ditolak kembali ke `DRAFT`, tidak pernah ACTIVE (technical-specs 06 §6.13). */
  async reject(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<void> {
    const { versionId } = routeChangeDataSchema.parse(request.newData);
    await this.versions.setStatus(tx, versionId, { status: "DRAFT" }, reviewer.userId);
  }

  private async waitingVersion(tx: Tx, versionId: string): Promise<RouteVersionDetail> {
    const version = await this.versions.findDetailById(tx, versionId);
    if (version?.status !== "WAITING_APPROVAL") throw DomainError.standard("INVALID_STATE");
    return version;
  }
}
