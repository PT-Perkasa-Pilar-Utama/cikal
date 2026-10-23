import type { DocumentChecklistData } from "@cikal/contracts";
import { describe, expect, it } from "vitest";
import { checklistDisplayName, checklistExists, noDocumentSelected } from "./checklist-rules.js";

const data = (count: number): DocumentChecklistData => ({
  productId: "0192b6f2-0001-7000-8000-000000000002",
  productName: "KPR Subsidi",
  occupation: "001",
  occupationName: "Karyawan Swasta",
  marital: "002",
  maritalName: "Kawin",
  items: Array.from({ length: count }, (_, index) => ({
    documentType: `DOC${index}`,
    documentName: `Dokumen ${index}`,
    isMandatory: true,
  })),
  isActive: true,
});

describe("checklist rules (api-specs 08 §8.11)", () => {
  it("AC-25.01 names the pending checklist by its combination and document count", () => {
    expect(checklistDisplayName(data(7))).toBe("KPR Subsidi / Karyawan Swasta / Kawin (7 documents)");
    expect(checklistDisplayName(data(1))).toBe("KPR Subsidi / Karyawan Swasta / Kawin (1 document)");
  });

  it("AC-25.02 rejects a checklist without documents with 422 NO_DOCUMENT_SELECTED", () => {
    expect(noDocumentSelected()).toMatchObject({
      code: "NO_DOCUMENT_SELECTED",
      status: 422,
      message: "Select at least one document",
    });
  });

  it("AC-25.03 rejects a repeated combination with 409 CHECKLIST_EXISTS", () => {
    expect(checklistExists()).toMatchObject({
      code: "CHECKLIST_EXISTS",
      status: 409,
      message: "Document checklist already exists for this combination",
    });
  });
});
