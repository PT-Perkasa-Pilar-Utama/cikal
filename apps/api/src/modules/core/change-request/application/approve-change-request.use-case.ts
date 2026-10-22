import type { ChangeRequestReviewRequest, ChangeRequestReviewResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AuditTrail } from "../../audit/index.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { CHANGE_REQUEST_MESSAGES } from "../domain/review-policy.js";
import { ChangeRequestRegistry } from "./change-request-registry.js";
import { revalidate } from "./revalidate.js";
import { ReviewGate } from "./review-gate.js";

const DEFAULT_DESCRIPTION = "Approve change request";

/**
 * `POST /change-requests/{id}/approve` (api-specs 07 §7.4). Validasi ulang, `apply` modul pemilik, status, dan
 * audit berjalan dalam satu transaksi, jadi paket impor berlaku utuh atau tidak sama sekali (AC-12.07).
 * Hak akses dan data master dibaca dari database per request, jadi data yang disetujui berlaku pada request
 * berikutnya tanpa event pembuang cache.
 */
@Injectable()
export class ApproveChangeRequestUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly requests: ChangeRequestsRepository,
    private readonly registry: ChangeRequestRegistry,
    private readonly gate: ReviewGate,
    private readonly audit: AuditTrail,
  ) {}

  async execute(
    ctx: RequestContext,
    id: string,
    body: ChangeRequestReviewRequest,
  ): Promise<ChangeRequestReviewResponse> {
    await this.gate.authorize(ctx, id);
    return this.db.withTenantTx(ctx, async (tx) => {
      const request = await this.gate.lock(tx, id, ctx.userId);
      const handler = this.registry.get(request.entityType);
      await revalidate(() => handler.validate(tx, request));
      const result = await handler.apply(tx, request, ctx);
      const entityId = request.entityId ?? result.entityId;
      await this.requests.markReviewed(tx, id, {
        status: "APPROVED",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        entityId,
      });
      await this.audit.record(tx, ctx, {
        module: handler.auditModule,
        action: "APPROVE",
        recordId: entityId ?? id,
        description: body.comment ?? DEFAULT_DESCRIPTION,
        oldData: request.oldData,
        newData: request.newData,
      });
      return {
        data: { id, status: "APPROVED", entityId, versionNumber: result.versionNumber },
        message: CHANGE_REQUEST_MESSAGES.approved,
      };
    });
  }
}
