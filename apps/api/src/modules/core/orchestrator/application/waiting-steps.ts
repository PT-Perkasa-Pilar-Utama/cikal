import type { ProcessStatus, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationProcess } from "../../application/index.js";
import { ProcessInstancesRepository } from "../db/process-instances.repository.js";
import { StepExecutionsRepository } from "../db/step-executions.repository.js";
import { stepContext } from "../domain/step-context.js";
import { type StepHandler, StepHandlerRegistry } from "./step-handler.js";
import { StepResults, type StepRun } from "./step-results.js";

export type ExternalMatch = "MATCHED" | "IGNORED_NOT_WAITING" | "DUPLICATE";

const DEADLINE_EXCEEDED = "No response from the provider before the wait deadline";
const ACTIVE: ReadonlySet<ProcessStatus> = new Set(["RUNNING", "WAITING"]);

/**
 * Keluar dari WAITING_HUMAN dan WAITING_EXTERNAL (technical-specs 06 §6.13): tugas ditutup, data pihak ketiga
 * masuk, atau batas tunggu lewat. Hanya attempt terakhir yang sedang menunggu yang bisa diselesaikan.
 */
@Injectable()
export class WaitingSteps {
  constructor(
    private readonly db: TenantTx,
    private readonly steps: StepExecutionsRepository,
    private readonly processes: ProcessInstancesRepository,
    private readonly applications: ApplicationProcess,
    private readonly handlers: StepHandlerRegistry,
    private readonly results: StepResults,
  ) {}

  /** `completeHumanStep` dari Task Queue saat tugas ditutup (TQ-05); `userId` dicatat sebagai pelaku langkah. */
  async completeHumanStep(
    tx: Tx,
    stepExecutionId: string,
    resultCode: string,
    payload: unknown,
    userId: string,
  ): Promise<void> {
    const run = await this.lockedRun(tx, stepExecutionId);
    if (!run || run.step.status !== "WAITING_HUMAN") throw DomainError.standard("INVALID_STATE");
    const handler = this.handlerFor(run, "onHumanTaskClosed");
    await this.results.apply(tx, run, await handler.onHumanTaskClosed(tx, run.ctx, resultCode, payload), userId);
  }

  /** `receiveExternal` dari endpoint data masuk Integration Registry (IN-15): idempoten per `externalReference`. */
  async receiveExternal(tx: Tx, externalReference: string, payload: unknown): Promise<ExternalMatch> {
    const found = await this.steps.findByExternalReference(tx, externalReference);
    const run = found ? await this.lockedRun(tx, found.id) : null;
    if (!run || run.step.status !== "WAITING_EXTERNAL") {
      return run?.step.status === "COMPLETED" ? "DUPLICATE" : "IGNORED_NOT_WAITING";
    }
    const handler = this.handlerFor(run, "onExternalResult");
    await this.results.apply(tx, run, await handler.onExternalResult(tx, run.ctx, payload), null);
    return "MATCHED";
  }

  /** Job batas tunggu: langkah yang masih menunggu menjadi ERROR `TIMEOUT` tanpa retry otomatis (IN-08). */
  expireWait(tenantId: string, stepExecutionId: string): Promise<void> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const run = await this.lockedRun(tx, stepExecutionId);
      if (!run || run.step.status !== "WAITING_EXTERNAL") return;
      const result: StepResult = {
        type: "ERROR",
        errorCategory: "TIMEOUT",
        errorMessage: DEADLINE_EXCEEDED,
        retryable: false,
      };
      await this.results.apply(tx, run, result, null);
    });
  }

  /** Mengunci proses lalu membaca ulang langkah; `null` bila langkah tidak ada atau bukan attempt terakhir. */
  private async lockedRun(tx: Tx, stepExecutionId: string): Promise<StepRun | null> {
    const found = await this.steps.findById(tx, stepExecutionId);
    if (!found) return null;
    const process = await this.processes.lock(tx, found.processInstanceId);
    const latest = (await this.steps.listLatest(tx, found.processInstanceId)).find(
      (step) => step.stepCode === found.stepCode,
    );
    // Proses yang dihentikan dari Process Monitoring tidak menerima hasil langkah lagi (AC-86.02).
    if (!process || !ACTIVE.has(process.status) || latest?.id !== found.id) return null;
    const application = await this.applications.find(tx, process.applicationId);
    if (!application) throw new Error(`Application ${process.applicationId} not found`);
    const ctx = stepContext({
      process,
      loanId: application.loanId,
      stepCode: latest.stepCode,
      attempt: latest.attempt,
      correlationId: uuidv7(),
    });
    return { process, step: latest, ctx };
  }

  /** Langkah yang menunggu wajib punya handler lanjutan; tanpa itu modul langkahnya salah pasang. */
  private handlerFor<K extends "onHumanTaskClosed" | "onExternalResult">(
    run: StepRun,
    hook: K,
  ): StepHandler & Required<Pick<StepHandler, K>> {
    const handler = this.handlers.get(run.step.stepCode);
    if (!handler || !hasHook(handler, hook)) {
      throw new Error(`Step ${run.step.stepCode} is ${run.step.status} but its handler has no ${hook}`);
    }
    return handler;
  }
}

function hasHook<K extends keyof StepHandler>(
  handler: StepHandler,
  hook: K,
): handler is StepHandler & Required<Pick<StepHandler, K>> {
  return typeof handler[hook] === "function";
}
