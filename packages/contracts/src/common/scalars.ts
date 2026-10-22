import { z } from "zod";

/** Uang rupiah sebagai string desimal 2 angka (api-specs 01 §1.2). */
export const money = z.string().regex(/^-?\d{1,16}\.\d{2}$/, "Invalid money format");

/** Persen sebagai string desimal 4 angka, contoh "12.0000" (api-specs 01 §1.2). */
export const percent = z.string().regex(/^\d{1,5}\.\d{4}$/, "Invalid percent format");

/** Skor 0 s.d. 1 sebagai string desimal 4 angka. */
export const score = z.string().regex(/^[01]\.\d{4}$/, "Invalid score format");

export const id = z.uuid();
export const businessDate = z.iso.date();
export const timestamp = z.iso.datetime();
