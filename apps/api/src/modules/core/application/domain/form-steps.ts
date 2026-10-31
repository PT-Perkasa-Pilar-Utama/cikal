import type { FormSection, ProductCategory } from "@cikal/contracts";

/** Fakta draft penentu step form: kategori produk, status kawin, dan pekerjaan (TRM_STP, AC-50.06). */
export interface FormStepFacts {
  productCategory: ProductCategory;
  /** Marital pemohon termasuk parameter `MARRIED_MARITAL_STATUSES`. */
  married: boolean;
  /** Occupation pemohon termasuk parameter `SELF_EMPLOYED_OCCUPATIONS`. */
  selfEmployed: boolean;
}

/**
 * Urutan step form (api-specs 12 §12.1): Spouse bila kawin (US-43), Business bila wiraswasta (US-45), Collateral
 * untuk kategori `COLLATERAL` dan `PENSION` (US-46).
 */
export function formSteps({ productCategory, married, selfEmployed }: FormStepFacts): FormSection[] {
  const collateral = productCategory === "COLLATERAL" || productCategory === "PENSION";
  return [
    "application",
    "personal",
    ...(married ? (["spouse"] as const) : []),
    "occupation",
    ...(selfEmployed ? (["business"] as const) : []),
    ...(collateral ? (["collateral"] as const) : []),
    "documents",
    "emergency-contact",
  ];
}

/** Step setelah `section` di `steps`; `null` untuk step terakhir. */
export function stepAfter(steps: readonly FormSection[], section: FormSection): FormSection | null {
  const index = steps.indexOf(section);
  return index < 0 ? null : (steps[index + 1] ?? null);
}
