import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { akadTemplateDocx, wordDocument } from "../seed/akad-template.js";
import { akadDocumentCode, detectPlaceholders, fillTemplate } from "./document-template.js";

const bodyText = (docx: Buffer): string =>
  (new PizZip(docx).file("word/document.xml")?.asText() ?? "").replace(/<[^>]+>/g, "|");

describe("document template", () => {
  it("names the akad template per product code", () => {
    expect(akadDocumentCode("KPR")).toBe("AKAD-KPR");
  });

  it("detects the placeholders of the seed akad template", () => {
    expect(detectPlaceholders(akadTemplateDocx())).toEqual([
      "bankAccountNumber",
      "contractDate",
      "contractNumber",
      "customerAccountNumber",
      "customerName",
      "installment",
      "interestRate",
      "loanId",
      "paymentMethod",
      "plafond",
      "productName",
      "riskManagerName",
      "tenor",
    ]);
  });

  it("AC-77.01 fills every placeholder with the application data", () => {
    const template = wordDocument(["Nomor: {{contractNumber}}", "Debitur: {{customerName}} & ahli waris"]);

    const filled = fillTemplate(template, { contractNumber: "011/PK/2026/000001", customerName: "Budi <Santoso>" });

    const text = bodyText(filled);
    expect(text).toContain("Nomor: 011/PK/2026/000001");
    expect(text).toContain("Debitur: Budi &lt;Santoso&gt; &amp; ahli waris");
    expect(text).not.toContain("{{");
  });

  it("refuses to fill a placeholder that has no data", () => {
    const template = wordDocument(["Nomor: {{contractNumber}}"]);

    expect(() => fillTemplate(template, {})).toThrow("Template placeholder {{contractNumber}} has no data");
  });
});
