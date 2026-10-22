/** Batas penguncian; nilai `LOCK_ATTEMPTS` dan `LOCK_MINUTES` di api-specs 02 §2.2 (AC-01.05). */
export const LOCK_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

const MS_PER_MINUTE = 60_000;

/** Label modul kejadian login dan logout di "Audit Trail" (AC-14.06). */
export const AUTHENTICATION_AUDIT_MODULE = "Authentication";

export interface LoginAccount {
  status: string;
  hasRole: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
}

export type LoginRejection = "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "ACCOUNT_INACTIVE" | "ACCOUNT_NO_ROLE";

/** Pesan persis AC dan status HTTP tiap penolakan login (technical-specs 09 §9.6, api-specs 02 §2.2). */
export const LOGIN_REJECTIONS: Record<LoginRejection, { status: number; message: string }> = {
  INVALID_CREDENTIALS: { status: 401, message: "Invalid username or password" },
  ACCOUNT_LOCKED: { status: 423, message: "Your account is locked for 15 minutes due to too many failed attempts" },
  ACCOUNT_INACTIVE: { status: 403, message: "Your account is inactive. Please contact your administrator" },
  ACCOUNT_NO_ROLE: { status: 403, message: "Your account has no role yet. Please contact your administrator" },
};

export function isLocked(account: LoginAccount, now: Date): boolean {
  return account.lockedUntil !== null && account.lockedUntil.getTime() > now.getTime();
}

/**
 * Password salah: hitungan gagal bertambah dan kegagalan ke-5 berturut-turut mengunci 15 menit (AC-01.05).
 * Kunci yang sudah lewat memulai hitungan dari nol.
 */
export function afterWrongPassword(
  account: LoginAccount,
  now: Date,
): { failedLoginCount: number; lockedUntil: Date | null; rejection: LoginRejection } {
  const expiredLock = account.lockedUntil !== null && !isLocked(account, now);
  const failedLoginCount = (expiredLock ? 0 : account.failedLoginCount) + 1;
  if (failedLoginCount < LOCK_ATTEMPTS) {
    return { failedLoginCount, lockedUntil: null, rejection: "INVALID_CREDENTIALS" };
  }
  return {
    failedLoginCount,
    lockedUntil: new Date(now.getTime() + LOCK_MINUTES * MS_PER_MINUTE),
    rejection: "ACCOUNT_LOCKED",
  };
}

/** Password benar: status akun menentukan boleh masuk atau tidak (api-specs 02 §2.2 langkah 5, AC-01.07). */
export function rejectionForStatus(account: LoginAccount): LoginRejection | null {
  if (account.status === "INACTIVE") return "ACCOUNT_INACTIVE";
  if (account.status === "LOCKED") return "ACCOUNT_LOCKED";
  if (account.status === "NO_ROLE" || !account.hasRole) return "ACCOUNT_NO_ROLE";
  return null;
}
