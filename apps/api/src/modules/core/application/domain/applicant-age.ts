/** Tanggal `YYYY-MM-DD` menjadi tahun, bulan, dan hari. */
function dateParts(date: string): [number, number, number] {
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return [year, month, day];
}

/** Usia dalam bulan penuh pada tanggal bisnis `today` (RM-02). */
export function ageInMonths(dateOfBirth: string, today: string): number {
  const [birthYear, birthMonth, birthDay] = dateParts(dateOfBirth);
  const [year, month, day] = dateParts(today);
  return (year - birthYear) * 12 + (month - birthMonth) - (day < birthDay ? 1 : 0);
}

/** Usia dalam tahun penuh pada tanggal bisnis `today`, default rumus `APPLICANT_AGE` (RM-02). */
export function ageInYears(dateOfBirth: string, today: string): number {
  return Math.floor(ageInMonths(dateOfBirth, today) / 12);
}
