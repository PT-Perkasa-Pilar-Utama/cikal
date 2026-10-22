import type { Action, MenuCode } from "@cikal/contracts";
import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DomainError } from "./domain-error.js";

export type AccessRule =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "menu"; menuCode: MenuCode; action: Action };

export const ACCESS_RULE = "cikal:access-rule";

/** Rute tanpa sesi (login, health live). */
export const Public = () => SetMetadata(ACCESS_RULE, { kind: "public" } satisfies AccessRule);

/** Rute yang butuh sesi tetapi tidak terikat satu menu (logout, sesi, change request lintas entity). */
export const Authenticated = () => SetMetadata(ACCESS_RULE, { kind: "authenticated" } satisfies AccessRule);

/** Hak menu dan aksi yang wajib dimiliki pemanggil (technical-specs 07 §7.2, AC-09.04). */
export const Requires = (menuCode: MenuCode, action: Action) =>
  SetMetadata(ACCESS_RULE, { kind: "menu", menuCode, action } satisfies AccessRule);

/**
 * Guard global. Rute tanpa aturan akses ditolak (fail closed); uji arsitektur menolaknya lebih awal.
 * Pemeriksaan sesi, CSRF, lisensi, dan hak menu dipasang di kartu TL-S1-03.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.getAllAndOverride<AccessRule | undefined>(ACCESS_RULE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rule) {
      throw DomainError.standard("ACCESS_DENIED");
    }
    return true;
  }
}
