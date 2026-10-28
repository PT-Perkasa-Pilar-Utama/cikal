import type { DocumentNumberFormatListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DocumentNumberFormatsRepository } from "../db/document-number-formats.repository.js";

/** Halaman "Document Number Format": format ACTIVE per jenis dokumen (api-specs 10 §10.3). */
@Injectable()
export class ListNumberFormatsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly formats: DocumentNumberFormatsRepository,
  ) {}

  execute(ctx: TenantContext): Promise<DocumentNumberFormatListResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.formats.listCurrent(tx);
      const pending = new Set(rows.filter((row) => row.status === "WAITING_APPROVAL").map((row) => row.documentType));
      const data = rows.flatMap((row) =>
        row.status === "ACTIVE" && row.effectiveFrom
          ? [
              {
                id: row.id,
                documentType: row.documentType,
                pattern: row.pattern,
                resetPeriod: row.resetPeriod,
                counterScope: row.counterScope,
                versionNumber: row.versionNumber,
                status: "ACTIVE" as const,
                effectiveFrom: row.effectiveFrom.toISOString(),
                hasPendingChange: pending.has(row.documentType),
              },
            ]
          : [],
      );
      return { data };
    });
  }
}
