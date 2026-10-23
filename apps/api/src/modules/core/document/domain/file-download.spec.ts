import { describe, expect, it } from "vitest";
import { contentDisposition, pdfFileName } from "./file-download.js";

describe("pdfFileName", () => {
  it.each([
    ["ktp.jpg", "ktp.pdf"],
    ["slip-gaji.pdf", "slip-gaji.pdf"],
    ["surat.kuasa.docx", "surat.kuasa.pdf"],
    ["npwp", "npwp.pdf"],
  ])("names %s as %s", (fileName, expected) => {
    expect(pdfFileName(fileName)).toBe(expected);
  });
});

describe("contentDisposition", () => {
  it("keeps an ASCII name in both parameters", () => {
    expect(contentDisposition("inline", "ktp.pdf")).toBe(`inline; filename="ktp.pdf"; filename*=UTF-8''ktp.pdf`);
  });

  it("replaces quotes and non-ASCII characters in the fallback name only", () => {
    expect(contentDisposition("attachment", 'slip "gaji" é.pdf')).toBe(
      `attachment; filename="slip _gaji_ _.pdf"; filename*=UTF-8''slip%20%22gaji%22%20%C3%A9.pdf`,
    );
  });
});
