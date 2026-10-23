import type { DocumentCompleteness } from "@cikal/contracts";

export interface ChecklistItem {
  documentType: string;
  isMandatory: boolean;
}

/** Dokumen wajib terunggah dibanding wajib checklist; dokumen opsional tidak dihitung (AC-47.06). */
export function documentCompleteness(
  items: readonly ChecklistItem[],
  uploadedTypes: ReadonlySet<string>,
): DocumentCompleteness {
  const mandatory = items.filter((item) => item.isMandatory);
  return {
    uploadedMandatory: mandatory.filter((item) => uploadedTypes.has(item.documentType)).length,
    requiredMandatory: mandatory.length,
  };
}
