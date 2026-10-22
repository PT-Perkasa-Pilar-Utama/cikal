import type { FastifyReply } from "fastify";
import { CSRF_COOKIE, SESSION_COOKIE } from "../../../../platform/http/session-token.js";

/** Atribut cookie sesi web (api-specs 02 §2.1); `secure` dari `SESSION_COOKIE_SECURE`. */
const sessionCookie = (secure: boolean) => ({ httpOnly: true, secure, sameSite: "strict", path: "/api" }) as const;
/** Cookie CSRF dibaca klien lalu disalin ke header `X-CSRF-Token`, jadi tidak HttpOnly. */
const csrfCookie = (secure: boolean) => ({ httpOnly: false, secure, sameSite: "strict", path: "/" }) as const;

export function setSessionCookies(
  reply: FastifyReply,
  session: { sessionToken: string; csrfToken: string; expiresAt: Date },
  secure: boolean,
): void {
  void reply
    .setCookie(SESSION_COOKIE, session.sessionToken, { ...sessionCookie(secure), expires: session.expiresAt })
    .setCookie(CSRF_COOKIE, session.csrfToken, { ...csrfCookie(secure), expires: session.expiresAt });
}

/** Logout mengosongkan kedua cookie dengan `Max-Age=0` (api-specs 02 §2.3). */
export function clearSessionCookies(reply: FastifyReply, secure: boolean): void {
  void reply
    .setCookie(SESSION_COOKIE, "", { ...sessionCookie(secure), maxAge: 0 })
    .setCookie(CSRF_COOKIE, "", { ...csrfCookie(secure), maxAge: 0 });
}
