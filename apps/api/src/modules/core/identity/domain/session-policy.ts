/** Batas idle sesi; nilai bawaan `SESSION_IDLE_MINUTES` di api-specs 02 §2.1. */
export const SESSION_IDLE_MINUTES = 30;
/** Batas absolut sesi sejak login (api-specs 02 §2.1). */
export const SESSION_ABSOLUTE_HOURS = 12;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Batas absolut sesi yang dibuat pada `loginAt`. */
export function sessionExpiry(loginAt: Date): Date {
  return new Date(loginAt.getTime() + SESSION_ABSOLUTE_HOURS * MS_PER_HOUR);
}

export interface SessionTimes {
  lastActivityAt: Date;
  /** Batas absolut 12 jam sejak login. */
  expiresAt: Date;
}

/** Menit ke-29 tanpa aktivitas masih aktif, menit ke-30 kedaluwarsa (AC-06.03, AC-06.04). */
export function isSessionExpired(session: SessionTimes, now: Date): boolean {
  const idleMs = now.getTime() - session.lastActivityAt.getTime();
  return idleMs >= SESSION_IDLE_MINUTES * MS_PER_MINUTE || now.getTime() >= session.expiresAt.getTime();
}
