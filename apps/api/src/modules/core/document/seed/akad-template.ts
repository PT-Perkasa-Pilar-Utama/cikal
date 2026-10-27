import PizZip from "pizzip";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ' +
  'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Target="word/document.xml" ' +
  'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/></Relationships>';

/** Isi "Surat Perjanjian Kredit" seed; tiap baris satu paragraf. */
const AKAD_LINES: readonly string[] = [
  "SURAT PERJANJIAN KREDIT",
  "Nomor: {{contractNumber}}",
  "Tanggal: {{contractDate}}",
  "",
  "Loan ID: {{loanId}}",
  "Nama Debitur: {{customerName}}",
  "Produk: {{productName}}",
  "Plafond: {{plafond}}",
  "Jangka Waktu: {{tenor}} bulan",
  "Suku Bunga: {{interestRate}} per tahun",
  "Angsuran per Bulan: {{installment}}",
  "Metode Pembayaran: {{paymentMethod}}",
  "Rekening Bank Pencair: {{bankAccountNumber}}",
  "Rekening Debitur: {{customerAccountNumber}}",
  "",
  "Risk Manager: {{riskManagerName}}",
];

const escapeXml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Dokumen Word dari baris teks: satu paragraf per baris, run tunggal agar placeholder tidak terpecah. */
export function wordDocument(lines: readonly string[]): Buffer {
  const paragraphs = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");
  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}"><w:body>${paragraphs}</w:body></w:document>`,
  );
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Template akad seed (grooming v2 POC: template akad dari seed); placeholder diisi langkah Print Akad BE-S6-02. */
export const akadTemplateDocx = (): Buffer => wordDocument(AKAD_LINES);
