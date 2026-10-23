import { Decimal } from "decimal.js";

/** Nominal untuk pesan error dengan pemisah ribuan koma, contoh `5,000,000` (AC-39.03, AC-40.05). */
export function formatAmount(value: string): string {
  const [whole = "0", fraction = "00"] = new Decimal(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === "00" ? grouped : `${grouped}.${fraction}`;
}
