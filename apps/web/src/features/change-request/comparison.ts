import { formatDate, formatMoney, formatPercent, isIsoDate, isMoneyValue, isPercentValue } from "../../lib/format";

/** Cara satu jenis data master menamai field dan nilai enum-nya di layar Pending. */
export interface FieldPresentation {
  /** Label per nama field, contoh `limitAutoApproval` menjadi "Limit Auto Approval" (AC-12.02). */
  labels: Readonly<Record<string, string>>;
  /** Label nilai enum per nama field, contoh `productCategory` `NON_COLLATERAL` menjadi "Non Collateral Loan". */
  valueLabels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Field teknis yang tidak ditampilkan, contoh id role yang sudah diwakili nama role. */
  hidden?: readonly string[];
  /** Bentuk ulang data sebelum dibandingkan, contoh daftar langkah rute menjadi satu field per langkah. */
  reshape?: (data: JsonRecord) => JsonRecord;
}

export interface ComparisonRow {
  path: string;
  label: string;
  current: unknown;
  proposed: unknown;
  changed: boolean;
}

type JsonRecord = Record<string, unknown>;

const EMPTY_VALUE = "-";

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Objek bertingkat menjadi pasangan path bertitik dan nilai daun; array tetap utuh seperti `changedFields`. */
function flatten(data: JsonRecord | null, prefix = ""): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(data ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) {
      for (const [childPath, childValue] of flatten(value, path)) entries.set(childPath, childValue);
    } else {
      entries.set(path, value);
    }
  }
  return entries;
}

const lastSegment = (path: string): string => path.slice(path.lastIndexOf(".") + 1);

/** `limitAutoApproval` menjadi "Limit Auto Approval" untuk field tanpa label khusus. */
const humanize = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (first) => first.toUpperCase());

/**
 * Field diurutkan mengikuti urutan `labels` (urutan form), karena urutan kunci JSONB dari server tidak bermakna.
 * Field tanpa label menyusul dengan urutan aslinya.
 */
export function inLabelOrder(paths: readonly string[], presentation: FieldPresentation): string[] {
  const order = Object.keys(presentation.labels);
  const rank = (path: string): number => {
    const index = order.indexOf(path) >= 0 ? order.indexOf(path) : order.indexOf(lastSegment(path));
    return index >= 0 ? index : order.length;
  };
  return [...paths].sort((a, b) => rank(a) - rank(b));
}

export function fieldLabel(path: string, presentation: FieldPresentation): string {
  const name = lastSegment(path);
  return presentation.labels[path] ?? presentation.labels[name] ?? humanize(name);
}

/** Nilai skalar kontrak dalam format layar: uang, persen, tanggal, boolean, dan label enum. */
export function formatValue(path: string, value: unknown, presentation: FieldPresentation): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return JSON.stringify(value);
  const enumLabel = presentation.valueLabels?.[lastSegment(path)]?.[value];
  if (enumLabel) return enumLabel;
  if (isMoneyValue(value)) return formatMoney(value);
  if (isPercentValue(value)) return `${formatPercent(value)}%`;
  if (isIsoDate(value)) return formatDate(value);
  return value;
}

/**
 * Baris perbandingan "Current Data" dan "Proposed Data" dengan field yang berubah ditandai (api-specs 07 §7.3,
 * AC-12.02). Data baru (`CREATE`) tidak menandai field apa pun karena semuanya baru.
 */
export function comparisonRows(
  current: JsonRecord | null,
  proposed: JsonRecord,
  changedFields: readonly string[],
  presentation: FieldPresentation,
): ComparisonRow[] {
  const reshape = presentation.reshape ?? ((data: JsonRecord) => data);
  const before = flatten(current && reshape(current));
  const after = flatten(reshape(proposed));
  const hidden = new Set(presentation.hidden);
  const shown = [...new Set([...after.keys(), ...before.keys()])].filter((path) => !hidden.has(path));
  const paths = inLabelOrder(shown, presentation);
  const changed = new Set(current === null ? [] : changedFields);
  return paths.map((path) => ({
    path,
    label: fieldLabel(path, presentation),
    current: before.get(path),
    proposed: after.get(path),
    changed: changed.has(path),
  }));
}
