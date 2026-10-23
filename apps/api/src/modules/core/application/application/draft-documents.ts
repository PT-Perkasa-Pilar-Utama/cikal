import {
  APPLICATION_SUBMIT_MESSAGES,
  type ApplicationDocumentsResponse,
  type DocumentCompleteness,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import { DocumentFiles } from "../../document/index.js";
import { ApplicationChecklists } from "../../product/index.js";
import { ApplicationDocumentsRepository } from "../db/application-documents.repository.js";
import { ApplicationOccupationsRepository } from "../db/application-occupations.repository.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { type ChecklistItem, documentCompleteness } from "../domain/document-slots.js";

type DocumentsView = ApplicationDocumentsResponse["data"];

/**
 * Slot step Document dari checklist yang cocok dengan produk, pekerjaan, dan status kawin pengajuan (api-specs 12
 * §12.6, AC-25.04). Pekerjaan atau status kawin yang belum diisi belum bisa dicocokkan.
 */
@Injectable()
export class DraftDocuments {
  constructor(
    private readonly checklists: ApplicationChecklists,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly occupations: ApplicationOccupationsRepository,
    private readonly documents: ApplicationDocumentsRepository,
    private readonly files: DocumentFiles,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
  ) {}

  /** Item checklist pengajuan; tanpa checklist `422 CHECKLIST_NOT_CONFIGURED` (AC-25.05). */
  async items(tx: Tx, draft: DraftRow): Promise<ChecklistItem[]> {
    const items = await this.matchingItems(tx, draft);
    if (!items) {
      throw new DomainError("CHECKLIST_NOT_CONFIGURED", APPLICATION_SUBMIT_MESSAGES.checklistNotConfigured, 422);
    }
    return items;
  }

  /** `null` selama checklist belum bisa dicocokkan (api-specs 12 §12.5). */
  async completenessOrNull(tx: Tx, draft: DraftRow): Promise<DocumentCompleteness | null> {
    const items = await this.matchingItems(tx, draft);
    return items && this.completeness(tx, draft, items);
  }

  async completeness(tx: Tx, draft: DraftRow, items: readonly ChecklistItem[]): Promise<DocumentCompleteness> {
    const uploaded = await this.documents.listByApplication(tx, draft.id);
    return documentCompleteness(items, new Set(uploaded.map((row) => row.documentType)));
  }

  async view(tx: Tx, draft: DraftRow): Promise<DocumentsView> {
    const items = await this.items(tx, draft);
    const uploaded = await this.documents.listByApplication(tx, draft.id);
    const files = await this.files.describe(
      tx,
      uploaded.flatMap((row) => (row.fileId ? [row.fileId] : [])),
    );
    const labels = new Map(
      (await this.parameters.options(tx, "Document", { includeInactive: true })).map((option) => [
        option.paramId,
        option.paramValue,
      ]),
    );
    const slots = items.map((item) => {
      const document = uploaded.find((row) => row.documentType === item.documentType);
      const file = files.find((stored) => stored.fileId === document?.fileId);
      return {
        documentType: item.documentType,
        label: labels.get(item.documentType) ?? item.documentType,
        isMandatory: item.isMandatory,
        file: file ? { ...file, uploadedAt: file.uploadedAt.toISOString() } : null,
        verificationStatus: document?.verificationStatus ?? "PENDING",
      };
    });
    return { slots, completeness: documentCompleteness(items, new Set(uploaded.map((row) => row.documentType))) };
  }

  private async matchingItems(tx: Tx, draft: DraftRow): Promise<ChecklistItem[] | null> {
    const personal = await this.personals.findByApplication(tx, draft.id);
    const occupation = await this.occupations.findByApplication(tx, draft.id);
    if (!personal?.marital || !occupation?.occupation) return null;
    return this.checklists.items(tx, {
      productId: draft.productId,
      occupation: occupation.occupation,
      marital: personal.marital,
    });
  }
}
