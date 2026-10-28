import type { CounterScope, DocumentType, ResetPeriod } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Nilai token pola untuk satu dokumen (api-specs 10 §10.2); `date` tanggal bisnis `YYYY-MM-DD` Asia/Jakarta. */
export interface NumberContext {
  branchCode: string;
  productCode: string;
  companyCode: string;
  date: string;
}

type ValueToken = "BRANCH_CODE" | "PRODUCT_CODE" | "COMPANY_CODE" | "YYYY" | "YY" | "MM" | "MM_ROMAN" | "DD";
type Segment = { kind: "text"; text: string } | { kind: "token"; token: ValueToken } | { kind: "sequence" };

/** Pola yang lolos DN-03: tepat satu nomor urut `{SEQ:n}` dan hanya token api-specs 10 §10.2. */
export interface NumberPattern {
  segments: readonly Segment[];
  sequenceDigits: number;
}

const VALUE_TOKENS: readonly ValueToken[] = [
  "BRANCH_CODE",
  "PRODUCT_CODE",
  "COMPANY_CODE",
  "YYYY",
  "YY",
  "MM",
  "MM_ROMAN",
  "DD",
];
const TOKEN = /\{([^{}]*)\}/g;
const SEQUENCE = /^SEQ:([3-9])$/;
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;

const isValueToken = (name: string): name is ValueToken => VALUE_TOKENS.some((token) => token === name);

function invalidSequence(): DomainError {
  return new DomainError(
    "INVALID_SEQUENCE_TOKEN",
    "Pattern must contain exactly one sequence token {SEQ:n} with n between 3 and 9",
    422,
  );
}

/** Validasi pola api-specs 10 §10.5 langkah 1 lalu 2: nomor urut dulu (AC-102.04), lalu token asing (AC-102.05). */
export function parsePattern(pattern: string): NumberPattern {
  const names = [...pattern.matchAll(TOKEN)].map((match) => match[1] ?? "");
  const sequences = names.filter((name) => name === "SEQ" || name.startsWith("SEQ:"));
  const digits = sequences.length === 1 ? SEQUENCE.exec(sequences[0] ?? "")?.[1] : undefined;
  if (!digits) throw invalidSequence();
  const unknown = names.find((name) => !name.startsWith("SEQ") && !isValueToken(name));
  if (unknown !== undefined) throw new DomainError("UNKNOWN_TOKEN", `Unknown token: ${unknown}`, 422);

  const segments: Segment[] = [];
  let last = 0;
  for (const match of pattern.matchAll(TOKEN)) {
    if (match.index > last) segments.push({ kind: "text", text: pattern.slice(last, match.index) });
    const name = match[1] ?? "";
    segments.push(isValueToken(name) ? { kind: "token", token: name } : { kind: "sequence" });
    last = match.index + match[0].length;
  }
  if (last < pattern.length) segments.push({ kind: "text", text: pattern.slice(last) });
  return { segments, sequenceDigits: Number(digits) };
}

function tokenValue(token: ValueToken, ctx: NumberContext): string {
  const [year = "", month = "", day = ""] = ctx.date.split("-");
  switch (token) {
    case "BRANCH_CODE":
      return ctx.branchCode;
    case "PRODUCT_CODE":
      return ctx.productCode;
    case "COMPANY_CODE":
      return ctx.companyCode;
    case "YYYY":
      return year;
    case "YY":
      return year.slice(2);
    case "MM":
      return month;
    case "MM_ROMAN":
      return ROMAN_MONTHS[Number(month) - 1] ?? "";
    case "DD":
      return day;
  }
}

/** Nomor dokumen dari pola, konteks, dan nomor urut yang diisi nol di depan. */
export function renderNumber(pattern: NumberPattern, ctx: NumberContext, sequence: number): string {
  const seq = String(sequence).padStart(pattern.sequenceDigits, "0");
  return pattern.segments
    .map((segment) => {
      if (segment.kind === "text") return segment.text;
      return segment.kind === "sequence" ? seq : tokenValue(segment.token, ctx);
    })
    .join("");
}

/** Nomor urut terbesar `{SEQ:n}`; sesudahnya pembentukan berhenti, tidak berputar ke 1 (DN-08). */
export function sequenceCapacity(pattern: NumberPattern): number {
  return 10 ** pattern.sequenceDigits - 1;
}

/** Kunci periode counter (DN-04): periode baru memakai baris counter baru (AC-102.03). */
export function periodKey(resetPeriod: ResetPeriod, date: string): string {
  const [year = "", month = "", day = ""] = date.split("-");
  switch (resetPeriod) {
    case "NONE":
      return "ALL";
    case "YEARLY":
      return year;
    case "MONTHLY":
      return `${year}${month}`;
    case "DAILY":
      return `${year}${month}${day}`;
  }
}

/** Kunci cakupan counter (DN-04), contoh `011` untuk `BRANCH` dan `011-KPR` untuk `BRANCH_PRODUCT`. */
export function scopeKey(scope: CounterScope, ctx: NumberContext): string {
  switch (scope) {
    case "COMPANY":
      return ctx.companyCode;
    case "BRANCH":
      return ctx.branchCode;
    case "PRODUCT":
      return ctx.productCode;
    case "BRANCH_PRODUCT":
      return `${ctx.branchCode}-${ctx.productCode}`;
  }
}

/** Nomor habis: operasi pemanggil gagal tanpa membentuk dokumen (api-specs 10 §10.6, AC-102.06). */
export function numberExhausted(documentType: DocumentType): DomainError {
  return new DomainError(
    "DOCUMENT_NUMBER_EXHAUSTED",
    `Document number sequence for ${documentType} has reached its limit. Please contact your administrator`,
    422,
  );
}

/** Tenant tanpa format ACTIVE untuk jenis dokumen ini (api-specs 10 §10.6). */
export function numberFormatNotSet(documentType: DocumentType): DomainError {
  return new DomainError(
    "DOCUMENT_NUMBER_FORMAT_NOT_SET",
    `Document number format for ${documentType} is not set. Please contact your administrator`,
    422,
  );
}
