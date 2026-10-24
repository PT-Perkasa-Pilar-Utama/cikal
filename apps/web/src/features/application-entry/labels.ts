import type { FormSection, ProductCategory } from "@cikal/contracts";

/** Label tab stepper per section (api-specs 12 §12.1, design-system 8.4). */
export const STEP_LABELS: Record<FormSection, string> = {
  application: "Application",
  personal: "Personal",
  spouse: "Spouse",
  occupation: "Occupation",
  business: "Business",
  collateral: "Collateral",
  documents: "Document",
  "emergency-contact": "Emergency Contact",
};

/**
 * Urutan step sebelum draft pertama tersimpan: TRM_STP_001 (api-specs 12 §12.1). Setelah itu stepper memakai `steps[]`
 * dari server.
 */
export const INITIAL_STEPS: readonly FormSection[] = [
  "application",
  "personal",
  "occupation",
  "documents",
  "emergency-contact",
];

/** Kategori produk; sama dengan layar Product (AC-20.01, design-system 8.6). */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  NON_COLLATERAL: "Non Collateral Loan",
  COLLATERAL: "Collateral Loan",
  PENSION: "Pension Credit",
  SYARIAH: "Syariah Compliant Finance",
};

/** Kode order opsional step Application (api-specs 12 §12.3). */
export const ORDER_LABELS = {
  sourceCode: "Source Code",
  salesCode: "Sales Code",
  referralCode: "Referral Code",
  marketingCode: "Marketing Code",
} as const;

/** Teks konfirmasi tombol "Back" (AC-39.04). */
export const UNSAVED_DATA_CONFIRMATION = "Unsaved data will be lost. Continue?";

/** Teks konfirmasi tombol "Submit" (AC-50.01). */
export const SUBMIT_CONFIRMATION = "Submit this application?";

/** Label checkbox persetujuan pemohon (AC-40.08). */
export const CONSENT_LABEL = "Applicant consents to credit checking and personal data processing";
