import { parseMoneyInput } from "../../lib/format";

/**
 * Pembaca input form pengajuan menjadi nilai body request. Input kosong menjadi `undefined` agar API menjawab
 * "This field is required" pada mode strict (AC-39.02); input yang formatnya salah dikirim apa adanya supaya skema
 * kontrak di API menolaknya dengan pesan per field.
 */

const INTEGER_INPUT = /^\d+$/;

export function textInput(data: FormData, name: string): string | undefined {
  const value = data.get(name);
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

/** `"20.000.000"` menjadi `"20000000.00"`. */
export function moneyInput(data: FormData, name: string): string | undefined {
  const text = textInput(data, name);
  return text === undefined ? undefined : (parseMoneyInput(text) ?? text);
}

/** Angka bulat; teks bukan angka dianggap kosong karena input memakai `inputMode="numeric"`. */
export function integerInput(data: FormData, name: string): number | undefined {
  const text = textInput(data, name);
  return text !== undefined && INTEGER_INPUT.test(text) ? Number(text) : undefined;
}
