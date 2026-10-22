type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Path field yang berbeda antara "Current Data" dan "Proposed Data", contoh `limitAutoApproval` atau
 * `pricing.adminFee` (api-specs 07 §7.3, AC-12.02). Objek ditelusuri per field; array dibandingkan utuh.
 * Data baru (`current` null) menandai semua field usulan.
 */
export function changedFields(current: unknown, proposed: unknown, path = ""): string[] {
  if (isRecord(proposed) || isRecord(current)) {
    const before = isRecord(current) ? current : {};
    const after = isRecord(proposed) ? proposed : {};
    const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])];
    return keys.flatMap((key) => changedFields(before[key], after[key], path ? `${path}.${key}` : key));
  }
  return JSON.stringify(current) === JSON.stringify(proposed) ? [] : [path];
}
