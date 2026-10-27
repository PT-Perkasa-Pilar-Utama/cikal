import { type StepCode, type StepStatus, stepCodes } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { ApplicationProcessView } from "../../../../platform/http/process-view-port.js";
import { ProductRoutes } from "../../product/index.js";
import { Licensing } from "../../tenancy/index.js";
import { ProcessInstancesRepository } from "../db/process-instances.repository.js";
import { StepExecutionsRepository } from "../db/step-executions.repository.js";
import { dedupMatchSkipReason, routeSkipReason } from "../domain/route-plan.js";
import { stepContext } from "../domain/step-context.js";
import { stepOutcomes } from "../domain/step-outcomes.js";
import { StepHandlerRegistry } from "./step-handler.js";

/** Bacaan hasil dan langkah berikutnya satu proses untuk modul lain (technical-specs 12 §12.6). */
@Injectable()
export class ProcessOutlook {
  constructor(
    private readonly processes: ProcessInstancesRepository,
    private readonly steps: StepExecutionsRepository,
    private readonly routes: ProductRoutes,
    private readonly licensing: Licensing,
    private readonly handlers: StepHandlerRegistry,
  ) {}

  async outcomes(tx: Tx, processInstanceId: string): Promise<Partial<Record<StepCode, string>>> {
    return stepOutcomes(await this.steps.listLatest(tx, processInstanceId));
  }

  /** Parameter yang dikunci saat submit (PR-06); `null` bila proses tidak ada di tenant transaksi. */
  async parameterSnapshot(tx: Tx, processInstanceId: string): Promise<Readonly<Record<string, string>> | null> {
    return (await this.processes.findById(tx, processInstanceId))?.parameterSnapshot ?? null;
  }

  /**
   * Status langkah `stepCode` pada proses terpilih atau terbaru pengajuan, untuk endpoint hasil langkah modul
   * (api-specs 19 §19.2). `null` bila pengajuan belum punya proses atau proses itu bukan miliknya.
   */
  async stepOf(
    tx: Tx,
    applicationId: string,
    stepCode: StepCode,
    processInstanceId?: string,
  ): Promise<{ processInstanceId: string; status: StepStatus } | null> {
    const processes = await this.processes.listByApplication(tx, applicationId);
    const process = processInstanceId
      ? processes.find((candidate) => candidate.id === processInstanceId)
      : processes.at(-1);
    if (!process) return null;
    const step = (await this.steps.listLatest(tx, process.id)).find((candidate) => candidate.stepCode === stepCode);
    return { processInstanceId: process.id, status: step?.status ?? "PENDING" };
  }

  /**
   * Proses pengajuan untuk "Application Detail" (api-specs 12 §12.9): langkah aktif adalah langkah proses terbaru
   * yang tidak `SKIPPED` dan tidak dilewati rute atau lisensi, termasuk yang belum dijalankan (AC-84.03).
   */
  async view(tx: Tx, applicationId: string): Promise<ApplicationProcessView> {
    const processes = await this.processes.listByApplication(tx, applicationId);
    const latest = processes.at(-1);
    const processInstances = processes.map(({ id, recontestNumber, status }) => ({ id, recontestNumber, status }));
    if (!latest) return { processInstances, stepStatuses: {}, activeSteps: [] };
    const steps = await this.steps.listLatest(tx, latest.id);
    const route = await this.routes.version(tx, latest.routeVersionId);
    const licensed = (await this.licensing.state(tx)).modules;
    return {
      processInstances,
      stepStatuses: Object.fromEntries(steps.map((step) => [step.stepCode, step.status])),
      activeSteps: steps
        .filter((step) => step.status !== "SKIPPED" && !routeSkipReason(step.stepCode, route.steps, licensed))
        .map((step) => step.stepCode),
    };
  }

  /**
   * Langkah yang berjalan sesudah `after`: langkah yang sudah dimulai atau selesai dibaca dari riwayat; langkah
   * PENDING dinilai dengan aturan lewati yang sama dengan `advance` (rute, lisensi, syarat langkah).
   */
  async nextStep(tx: Tx, processInstanceId: string, after: StepCode): Promise<StepCode | null> {
    const process = await this.processes.findById(tx, processInstanceId);
    if (!process) throw new Error(`Process ${processInstanceId} not found`);
    const latestSteps = await this.steps.listLatest(tx, process.id);
    const latest = new Map(latestSteps.map((step) => [step.stepCode, step]));
    const route = await this.routes.version(tx, process.routeVersionId);
    const licensed = (await this.licensing.state(tx)).modules;
    for (const stepCode of stepCodes.slice(stepCodes.indexOf(after) + 1)) {
      const step = latest.get(stepCode);
      if (!step || step.status === "SKIPPED") continue;
      if (step.status !== "PENDING") return stepCode;
      if (routeSkipReason(stepCode, route.steps, licensed)) continue;
      if (dedupMatchSkipReason(stepCode, stepOutcomes(latestSteps))) continue;
      const handler = this.handlers.get(stepCode);
      if (handler?.isApplicable) {
        const ctx = stepContext({
          process,
          loanId: process.loanId,
          stepCode,
          attempt: step.attempt,
          correlationId: uuidv7(),
        });
        if (!(await handler.isApplicable(tx, ctx))) continue;
      }
      return stepCode;
    }
    return null;
  }
}
