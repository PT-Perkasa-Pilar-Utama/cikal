import { businessDate } from "../../../../platform/clock/business-date.js";

const DAY_MS = 86_400_000;

/**
 * Aging dalam hari kalender: selisih tanggal bisnis selesai dan mulai, bukan selisih jam (AC-85.04, RM-04).
 * `AGING_UNIT` bawaan data dictionary adalah CALENDAR_DAY.
 */
export function calendarDayAging(startedAt: Date, endedAt: Date): string {
  const days = (Date.parse(businessDate(endedAt)) - Date.parse(businessDate(startedAt))) / DAY_MS;
  return String(days);
}
