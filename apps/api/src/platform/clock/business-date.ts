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

const BUSINESS_UTC_OFFSET = "+07:00";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rentang waktu satu tanggal bisnis `YYYY-MM-DD`: awal inklusif, akhir eksklusif. Asia/Jakarta tanpa DST. */
export function businessDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${BUSINESS_UTC_OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}
