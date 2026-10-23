import type { DocumentChecklistListQuery, DocumentChecklistListResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DocumentChecklistsRepository } from "../db/document-checklists.repository.js";
import { ChecklistChecks } from "./checklist-checks.js";

/** Halaman "Document Checklist" (api-specs 08 §8.12): hanya checklist yang sudah disetujui (api-specs 01 §1.8). */
@Injectable()
export class ListChecklistsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checklists: DocumentChecklistsRepository,
    private readonly checks: ChecklistChecks,
  ) {}

  execute(ctx: RequestContext, query: DocumentChecklistListQuery): Promise<DocumentChecklistListResponse> {
    const filter = { productId: query.productId, occupation: query.occupation, marital: query.marital };
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize };
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.checklists.list(tx, filter, page);
      const totalItems = await this.checklists.count(tx, filter);
      const pending = await this.checks.pendingIds(
        tx,
        rows.map((row) => row.id),
      );
      const labels = await this.checks.labels(tx);
      const label = (values: Map<string, string>, paramId: string) => ({
        paramId,
        paramValue: values.get(paramId) ?? paramId,
      });
      return {
        data: rows.map((row) => ({
          id: row.id,
          product: { id: row.productId, productCode: row.productCode, productName: row.productName },
          occupation: label(labels.occupation, row.occupation),
          marital: label(labels.marital, row.marital),
          items: row.items.map((item) => ({
            ...item,
            documentName: labels.document.get(item.documentType) ?? item.documentType,
          })),
          isActive: row.isActive,
          hasPendingChange: pending.has(row.id),
        })),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }
}
