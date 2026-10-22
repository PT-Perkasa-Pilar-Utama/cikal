import type { Action, MenuCode } from "@cikal/contracts";
import type { TenantContext } from "../db/tenant-tx.js";

/** Pelaku sebuah aksi untuk audit: tenant, user, dan IP asal request (technical-specs 06 §6.8 AUDIT_LOGS). */
export interface Actor extends TenantContext {
  /** `null` untuk aksi sistem tanpa request. */
  ipAddress: string | null;
}

/** Konteks request terautentikasi yang dipasang guard di `request.auth` (technical-specs 02 §2.5). */
export interface RequestContext extends Actor {
  sessionId: string;
  mustChangePassword: boolean;
}

export interface ResolvedSession extends TenantContext {
  sessionId: string;
  mustChangePassword: boolean;
  /** Hash token CSRF sesi WEB; `null` untuk kanal tanpa CSRF. */
  csrfTokenHash: Buffer | null;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: RequestContext;
  }
}

/**
 * Sambungan guard platform ke Identity & Access (technical-specs 07 §7.2). Platform tidak membaca tabel `iam`;
 * modul identity mendaftarkan implementasinya di token `ACCESS_PORT`.
 */
export interface AccessPort {
  /** Sesi dari nilai cookie: gagal dengan `401` sesuai api-specs 02 §2.1; `touch` memperbarui `lastActivityAt`. */
  resolveSession(token: string, options: { touch: boolean }): Promise<ResolvedSession>;
  /** Lisensi modul menu dan hak menu efektif hari ini; gagal dengan `403` (api-specs 02 §2.5 langkah 4 dan 5). */
  authorize(ctx: TenantContext, menuCode: MenuCode, action: Action): Promise<void>;
  /** Aturan yang sama dengan `authorize` tanpa melempar, untuk menampilkan atau menyembunyikan aksi. */
  allows(ctx: TenantContext, menuCode: MenuCode, action: Action): Promise<boolean>;
}

export const ACCESS_PORT = Symbol("ACCESS_PORT");
