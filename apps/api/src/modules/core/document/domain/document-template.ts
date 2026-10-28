import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

/** Penanda placeholder template Word, contoh `{{loanId}}` (AC-24.05). */
const DELIMITERS = { start: "{{", end: "}}" };
const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** Nilai placeholder yang sudah diformat pemanggil, contoh tanggal "20-10-2026" dan nominal "Rp 150.000.000". */
export type TemplateData = Readonly<Record<string, string>>;

/** Kode template akad per produk (api-specs 25 §25.3), contoh `AKAD-KPR`. */
export const akadDocumentCode = (productCode: string): string => `AKAD-${productCode}`;

function open(docx: Buffer): Docxtemplater {
  return new Docxtemplater(new PizZip(docx), {
    delimiters: DELIMITERS,
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => {
      throw new Error(`Template placeholder {{${part.value}}} has no data`);
    },
  });
}

/**
 * Nama placeholder di isi utama template, unik dan terurut, untuk kolom `document_templates.placeholders`. Teks
 * dibaca utuh lintas run Word, jadi placeholder yang terpecah format tetap terdeteksi.
 */
export function detectPlaceholders(docx: Buffer): string[] {
  const names = [...open(docx).getFullText().matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
  return [...new Set(names)].sort();
}

/** Mengisi placeholder template Word; placeholder tanpa data menggagalkan pengisian agar dokumen tidak bolong. */
export function fillTemplate(docx: Buffer, data: TemplateData): Buffer {
  const document = open(docx);
  document.render(data);
  return document.toBuffer();
}
