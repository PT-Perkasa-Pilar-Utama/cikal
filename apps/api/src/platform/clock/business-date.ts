/** Tanggal bisnis memakai zona Asia/Jakarta (api-specs 12 §12.2, api-specs 25). */
const BUSINESS_TIME_ZONE = "Asia/Jakarta";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal bisnis `YYYY-MM-DD` dari sebuah waktu UTC. */
export function businessDate(at: Date): string {
  return formatter.format(at);
}
