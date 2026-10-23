import { DOCUMENT_CHECKLIST_MESSAGES, type DocumentChecklistData } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Tanpa dokumen yang dicentang (AC-25.02). */
export const noDocumentSelected = (): DomainError =>
  new DomainError("NO_DOCUMENT_SELECTED", DOCUMENT_CHECKLIST_MESSAGES.noDocumentSelected, 422);

/** Kombinasi produk, pekerjaan, dan status kawin sudah ada atau sedang diajukan (AC-25.03). */
export const checklistExists = (): DomainError =>
  new DomainError("CHECKLIST_EXISTS", DOCUMENT_CHECKLIST_MESSAGES.checklistExists, 409);

/** Nama baris "Pending Document Checklist" dengan jumlah dokumennya (AC-25.01). */
export function checklistDisplayName(data: DocumentChecklistData): string {
  const count = data.items.length;
  const documents = count === 1 ? "document" : "documents";
  return `${data.productName} / ${data.occupationName} / ${data.maritalName} (${count} ${documents})`;
}
