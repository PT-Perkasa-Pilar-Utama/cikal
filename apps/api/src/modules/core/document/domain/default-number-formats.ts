import type { CounterScope, DocumentType, ResetPeriod } from "@cikal/contracts";

/**
 * Format default saat aktivasi tenant (grooming v3 DN-10): SP3K reset bulanan dan nomor kontrak reset tahunan, keduanya
 * per cabang.
 */
export const DEFAULT_NUMBER_FORMATS: readonly {
  documentType: DocumentType;
  pattern: string;
  resetPeriod: ResetPeriod;
  counterScope: CounterScope;
}[] = [
  {
    documentType: "SP3K",
    pattern: "{SEQ:4}/SP3K/{BRANCH_CODE}/{MM_ROMAN}/{YYYY}",
    resetPeriod: "MONTHLY",
    counterScope: "BRANCH",
  },
  {
    documentType: "CONTRACT",
    pattern: "{BRANCH_CODE}/PK/{YYYY}/{SEQ:6}",
    resetPeriod: "YEARLY",
    counterScope: "BRANCH",
  },
];
