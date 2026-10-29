const VISIBLE_DIGITS = 4;

/** `600000000.00` menjadi `Rp 600.000.000`; sen ditulis hanya bila bukan nol, contoh `Rp 4.804.000,50`. */
export function rupiah(amount: string): string {
  const [whole = "0", cents = "00"] = amount.split(".");
  const negative = whole.startsWith("-");
  const digits = negative ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp ${grouped}${/^0*$/.test(cents) ? "" : `,${cents}`}`;
}

/** `9.5000` menjadi `9,5%` dan `14.0000` menjadi `14%`. */
export function percentText(rate: string): string {
  const [whole = "0", fraction = ""] = rate.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return `${whole}${trimmed ? `,${trimmed}` : ""}%`;
}

/** Tanggal bisnis `YYYY-MM-DD` menjadi `DD-MM-YYYY` seperti di AC. */
export function dayMonthYear(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

/** Rekening untuk pembaca `APP-INQUIRY` saja: 4 digit akhir, sisanya `*` (api-specs 25 §25.1). */
export function maskAccountNumber(accountNumber: string): string {
  const hidden = Math.max(accountNumber.length - VISIBLE_DIGITS, 0);
  return `${"*".repeat(hidden)}${accountNumber.slice(hidden)}`;
}
