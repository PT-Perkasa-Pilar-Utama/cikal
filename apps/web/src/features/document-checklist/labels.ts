import { documentChecklistDataSchema } from "@cikal/contracts";
import type { FieldPresentation } from "../change-request/comparison";

/** Dokumen opsional ditandai seperti label slot unggah (AC-47.06). */
export const OPTIONAL_LABEL = "Optional";

/**
 * "Pending Document Checklist" menampilkan nama produk, pekerjaan, status kawin, dan daftar dokumen; `paramId`
 * tidak berarti bagi Checker.
 */
export const CHECKLIST_PRESENTATION: FieldPresentation = {
  labels: {
    productName: "Product",
    occupationName: "Occupation",
    maritalName: "Marital",
    documents: "Documents",
    isActive: "Active",
  },
  hidden: ["productId", "occupation", "marital", "items"],
  reshape: (data) => {
    const parsed = documentChecklistDataSchema.safeParse(data);
    if (!parsed.success) return data;
    const documents = parsed.data.items
      .map((item) => (item.isMandatory ? item.documentName : `${item.documentName} (${OPTIONAL_LABEL})`))
      .join(", ");
    return { ...data, documents };
  },
};
