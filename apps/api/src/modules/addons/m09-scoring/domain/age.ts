/** Usia penuh dalam tahun pada tanggal bisnis `on`; kedua tanggal berformat `YYYY-MM-DD`. */
export function ageOn(dateOfBirth: string, on: string): number {
  const [birthYear = 0, birthMonth = 0, birthDay = 0] = dateOfBirth.split("-").map(Number);
  const [year = 0, month = 0, day = 0] = on.split("-").map(Number);
  const beforeBirthday = month < birthMonth || (month === birthMonth && day < birthDay);
  return year - birthYear - (beforeBirthday ? 1 : 0);
}
