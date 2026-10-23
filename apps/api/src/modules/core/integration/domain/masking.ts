/** Field PII yang disamarkan di log panggilan: NIK, nomor KK, nama ibu, nomor rekening (IN-06, technical-specs 13 §13.6). */
const PII_FIELDS: ReadonlySet<string> = new Set(["nik", "kknumber", "mothermaidenname", "accountnumber"]);
const VISIBLE_SUFFIX = 4;

function maskText(value: string): string {
  const visible = value.length > VISIBLE_SUFFIX * 2 ? value.slice(-VISIBLE_SUFFIX) : "";
  return `${"*".repeat(value.length - visible.length)}${visible}`;
}

/** Salinan `value` dengan field PII disamarkan di semua kedalaman; nilai bukan teks pada field PII diganti `***`. */
export function maskPii(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskPii);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => {
      if (!PII_FIELDS.has(key.toLowerCase())) return [key, maskPii(field)];
      return [key, typeof field === "string" ? maskText(field) : "***"];
    }),
  );
}
