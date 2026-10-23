import type { ChangeRequestReviewRequest, ChangeRequestReviewResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { AuditTrail } from "../../audit/index.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { CHANGE_REQUEST_MESSAGES } from "../domain/review-policy.js";
import { ChangeRequestRegistry } from "./change-request-registry.js";
import { ReviewGate } from "./review-gate.js";

const DEFAULT_DESCRIPTION = "Reject change request";

/**
 * `POST /change-requests/{id}/reject` (api-specs 07 §7.5): data aktif tidak berubah (AC-12.03); versi data berversi
 * kembali ke `DRAFT` lewat `reject` handler di transaksi yang sama.
 */
@Injectable()
export class RejectChangeRequestUseCase {
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
      await handler.reject?.(tx, request, ctx);
      await this.requests.markReviewed(tx, id, {
        status: "REJECTED",
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        entityId: request.entityId,
      });
      await this.audit.record(tx, ctx, {
        module: handler.auditModule,
        action: "REJECT",
        recordId: request.entityId ?? id,
        description: body.comment ?? DEFAULT_DESCRIPTION,
        oldData: request.oldData,
        newData: request.newData,
      });
      return { data: { id, status: "REJECTED" }, message: CHANGE_REQUEST_MESSAGES.rejected };
    });
  }
}
