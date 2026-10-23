import { type StepCode, type StepContext, type StepResult, stepModules } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";

/**
 * Kontrak modul langkah (technical-specs 12 §12.2). Semua penulisan memakai `tx` dari orchestrator, sehingga data
 * langkah dan StepExecution commit bersama (invariant 1). `execute` dipanggil sekali per attempt dan wajib aman
 * dipanggil ulang dengan `idempotencyKey` yang sama.
 */
export interface StepHandler {
  readonly stepCode: StepCode;
  /** Modul pemilik langkah untuk pemeriksaan lisensi; sama dengan urutan baku tech ref 6.3. */
  readonly moduleCode: string;
  /** Langkah bersyarat (RT-08): `false` = SKIPPED `CONDITION_NOT_MET` tanpa memanggil `execute` (AC-31.04). */
  isApplicable?(tx: Tx, ctx: StepContext): Promise<boolean>;
  execute(tx: Tx, ctx: StepContext): Promise<StepResult>;
  onHumanTaskClosed?(tx: Tx, ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult>;
  onExternalResult?(tx: Tx, ctx: StepContext, payload: unknown): Promise<StepResult>;
}

/** Registrasi StepHandler per kode langkah; modul langkah mendaftar saat `onModuleInit` (XM-03). */
@Injectable()
export class StepHandlerRegistry {
  private readonly handlers = new Map<StepCode, StepHandler>();

  register(handler: StepHandler): void {
    if (handler.moduleCode !== stepModules[handler.stepCode]) {
      throw new Error(
        `Step ${handler.stepCode} belongs to ${stepModules[handler.stepCode]}, not ${handler.moduleCode}`,
      );
    }
    if (this.handlers.has(handler.stepCode)) throw new Error(`Step ${handler.stepCode} already has a handler`);
    this.handlers.set(handler.stepCode, handler);
  }

  get(stepCode: StepCode): StepHandler | undefined {
    return this.handlers.get(stepCode);
  }
}
