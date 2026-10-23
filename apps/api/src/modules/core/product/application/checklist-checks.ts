import type { DocumentChecklistData, DocumentChecklistItemInput, ParameterOption, ParamType } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError, type ErrorDetail } from "../../../../platform/http/domain-error.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { type ChecklistCombination, DocumentChecklistsRepository } from "../db/document-checklists.repository.js";
import { ProductsRepository } from "../db/products.repository.js";
import { checklistExists, noDocumentSelected } from "../domain/checklist-rules.js";

export const CHECKLIST_ENTITY_TYPE = "DOCUMENT_CHECKLIST";

export interface ChecklistInput extends ChecklistCombination {
  items: DocumentChecklistItemInput[];
  isActive: boolean;
}

/** Label `paramId` Occupation, Marital, dan Document termasuk nilai nonaktif, untuk membaca data lama. */
export interface ChecklistLabels {
  occupation: Map<string, string>;
  marital: Map<string, string>;
  document: Map<string, string>;
}

const toMap = (options: ParameterOption[]): Map<string, string> =>
  new Map(options.map((option) => [option.paramId, option.paramValue]));

/** Aturan checklist dokumen yang butuh database, dipakai saat Maker mengajukan dan Checker menyetujui. */
@Injectable()
export class ChecklistChecks {
  constructor(
    private readonly products: ProductsRepository,
    private readonly checklists: DocumentChecklistsRepository,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  /**
   * Data ChangeRequest dari input Maker (api-specs 08 §8.11 langkah 1): tanpa dokumen `422 NO_DOCUMENT_SELECTED`
   * (AC-25.02); produk tak dikenal atau `paramId` yang tidak aktif dijawab `400 VALIDATION_FAILED` per field.
   */
  async resolve(tx: Tx, input: ChecklistInput): Promise<DocumentChecklistData> {
    if (input.items.length === 0) throw noDocumentSelected();
    const product = await this.products.findById(tx, input.productId);
    const occupations = await this.activeLabels(tx, "Occupation");
    const maritals = await this.activeLabels(tx, "Marital");
    const documents = await this.activeLabels(tx, "Document");
    const details: ErrorDetail[] = [];
    const unknown = (field: string) => details.push({ field, code: "not_found", message: "Unknown value" });
    if (!product) unknown("productId");
    if (!occupations.has(input.occupation)) unknown("occupation");
    if (!maritals.has(input.marital)) unknown("marital");
    input.items.forEach((item, index) => {
      if (!documents.has(item.documentType)) unknown(`items.${index}.documentType`);
    });
    if (!product || details.length > 0) throw DomainError.standard("VALIDATION_FAILED", undefined, details);
    return {
      productId: product.id,
      productName: product.productName,
      occupation: input.occupation,
      occupationName: occupations.get(input.occupation) ?? input.occupation,
      marital: input.marital,
      maritalName: maritals.get(input.marital) ?? input.marital,
      items: input.items.map((item) => ({
        ...item,
        documentName: documents.get(item.documentType) ?? item.documentType,
      })),
      isActive: input.isActive,
    };
  }

  /** Langkah 2: kombinasi belum dipakai; saat Maker mengajukan, kombinasi yang sedang diajukan ikut dihitung. */
  async assertCombinationFree(
    tx: Tx,
    { productId, occupation, marital }: ChecklistCombination,
    options: { includePending: boolean },
  ): Promise<void> {
    const combination = { productId, occupation, marital };
    const pending =
      options.includePending && (await this.changeRequests.hasProposed(tx, CHECKLIST_ENTITY_TYPE, combination));
    if (pending || (await this.checklists.combinationExists(tx, combination))) throw checklistExists();
  }

  /** Satu permintaan terbuka per checklist (AC-12.06). */
  async assertNoPendingChange(tx: Tx, checklistId: string): Promise<void> {
    if ((await this.pendingIds(tx, [checklistId])).has(checklistId)) {
      throw DomainError.standard("PENDING_CHANGE_REQUEST");
    }
  }

  pendingIds(tx: Tx, checklistIds: readonly string[]): Promise<Set<string>> {
    return this.changeRequests.pendingEntityIds(tx, [CHECKLIST_ENTITY_TYPE], checklistIds);
  }

  async labels(tx: Tx): Promise<ChecklistLabels> {
    const all = { includeInactive: true };
    return {
      occupation: toMap(await this.parameters.options(tx, "Occupation", all)),
      marital: toMap(await this.parameters.options(tx, "Marital", all)),
      document: toMap(await this.parameters.options(tx, "Document", all)),
    };
  }

  private async activeLabels(tx: Tx, paramType: ParamType): Promise<Map<string, string>> {
    return toMap(await this.parameters.options(tx, paramType));
  }
}
