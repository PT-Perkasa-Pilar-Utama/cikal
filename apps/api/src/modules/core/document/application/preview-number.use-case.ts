import type { DocumentNumberPreviewRequest, DocumentNumberPreviewResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { NumberPreview } from "./number-preview.js";

/** `POST /document-number-formats/preview` (api-specs 10 §10.4): tidak menyentuh counter. */
@Injectable()
export class PreviewNumberUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly preview: NumberPreview,
  ) {}

  execute(ctx: TenantContext, body: DocumentNumberPreviewRequest): Promise<DocumentNumberPreviewResponse> {
    return this.db.withTenantTx(ctx, async (tx) => ({
      data: { preview: await this.preview.render(tx, ctx.tenantId, body.pattern) },
    }));
  }
}
