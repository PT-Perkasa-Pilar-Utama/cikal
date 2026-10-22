import { timingSafeEqual } from "node:crypto";
import type { Action, MenuCode } from "@cikal/contracts";
import { type CanActivate, type ExecutionContext, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { ACCESS_PORT, type AccessPort, type ResolvedSession } from "./access-port.js";
import { DomainError } from "./domain-error.js";
import { BACKGROUND_HEADER, CSRF_HEADER, hashToken, SESSION_COOKIE } from "./session-token.js";

export type AccessRule =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "menu"; menuCode: MenuCode; action: Action };

export const ACCESS_RULE = "cikal:access-rule";
export const ALLOW_DURING_PASSWORD_CHANGE = "cikal:allow-during-password-change";

/** Metode tanpa efek samping; selain ini wajib membawa `X-CSRF-Token` (api-specs 02 §2.5 langkah 2). */
const SAFE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** Rute tanpa sesi (login, health live). */
export const Public = () => SetMetadata(ACCESS_RULE, { kind: "public" } satisfies AccessRule);

/** Rute yang butuh sesi tetapi tidak terikat satu menu (logout, sesi, change request lintas entity). */
export const Authenticated = () => SetMetadata(ACCESS_RULE, { kind: "authenticated" } satisfies AccessRule);

/** Hak menu dan aksi yang wajib dimiliki pemanggil (technical-specs 07 §7.2, AC-09.04). */
export const Requires = (menuCode: MenuCode, action: Action) =>
  SetMetadata(ACCESS_RULE, { kind: "menu", menuCode, action } satisfies AccessRule);

/** Rute yang tetap terbuka selama `mustChangePassword` (ganti password, sesi, logout; api-specs 02 §2.1). */
export const AllowDuringPasswordChange = () => SetMetadata(ALLOW_DURING_PASSWORD_CHANGE, true);

function csrfMatches(session: ResolvedSession, header: string | string[] | undefined): boolean {
  if (!session.csrfTokenHash || typeof header !== "string" || header.length === 0) return false;
  const given = hashToken(header);
  return given.length === session.csrfTokenHash.length && timingSafeEqual(given, session.csrfTokenHash);
}

/**
 * Guard global dengan urutan api-specs 02 §2.5: sesi, CSRF, ganti password awal, lisensi dan hak menu.
 * Rute tanpa aturan akses ditolak (fail closed); uji arsitektur menolaknya lebih awal.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const rule = this.reflector.getAllAndOverride<AccessRule | undefined>(ACCESS_RULE, targets);
    if (!rule) throw DomainError.standard("ACCESS_DENIED");
    if (rule.kind === "public") return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = request.cookies[SESSION_COOKIE];
    if (!token) throw DomainError.standard("UNAUTHENTICATED");
    const session = await this.access.resolveSession(token, { touch: request.headers[BACKGROUND_HEADER] !== "true" });

    if (!SAFE_METHODS.has(request.method) && !csrfMatches(session, request.headers[CSRF_HEADER])) {
      throw DomainError.standard("CSRF_TOKEN_INVALID");
    }
    const allowed = this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_DURING_PASSWORD_CHANGE, targets);
    if (session.mustChangePassword && !allowed) throw DomainError.standard("PASSWORD_CHANGE_REQUIRED");
    if (rule.kind === "menu") await this.access.authorize(session, rule.menuCode, rule.action);

    request.auth = {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      userId: session.userId,
      mustChangePassword: session.mustChangePassword,
    };
    return true;
  }
}
