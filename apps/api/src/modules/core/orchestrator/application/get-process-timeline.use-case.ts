import type { ProcessTimelineQuery, ProcessTimelineResponse, StepActor, TimelineStep } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ApplicationProcess } from "../../application/index.js";
import { ProductRoutes } from "../../product/index.js";
import { ProcessInstancesRepository, type ProcessRow } from "../db/process-instances.repository.js";
import { StepExecutionsRepository, type StepRow } from "../db/step-executions.repository.js";
import { calendarDayAging } from "../domain/aging.js";
import { processError } from "../domain/process-errors.js";
import { inStepOrder } from "../domain/route-plan.js";

/** Label dropdown "Process" (AC-85.03). */
const processLabel = (process: ProcessRow) =>
  process.recontestNumber === 0 ? "Initial" : `Recontest ${process.recontestNumber}`;

/**
 * `GET /applications/{id}/process` (api-specs 13 §13.2): semua langkah versi rute yang dikunci, termasuk yang
 * dilewati, menurut urutan baku. Pengajuan tenant lain tidak terbaca karena RLS.
 */
@Injectable()
export class GetProcessTimelineUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly processes: ProcessInstancesRepository,
    private readonly steps: StepExecutionsRepository,
    private readonly routes: ProductRoutes,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  execute(ctx: TenantContext, applicationId: string, query: ProcessTimelineQuery): Promise<ProcessTimelineResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.find(tx, applicationId);
      if (!application) throw processError("APPLICATION_NOT_FOUND");
      const processes = await this.processes.listByApplication(tx, applicationId);
      if (processes.length === 0) throw processError("PROCESS_NOT_STARTED");
      const selected = query.processInstanceId
        ? processes.find((process) => process.id === query.processInstanceId)
        : processes.at(-1);
      if (!selected) throw DomainError.standard("NOT_FOUND");

      const route = await this.routes.version(tx, selected.routeVersionId);
      const steps = inStepOrder(await this.steps.listLatest(tx, selected.id));
      const actorIds = steps.flatMap((step) => (step.actorUserId ? [step.actorUserId] : []));
      const usernames = await this.users.describe(tx, actorIds);
      const now = new Date();
      return {
        data: {
          applicationId,
          loanId: application.loanId,
          processes: processes.map((process) => ({
            id: process.id,
            recontestNumber: process.recontestNumber,
            label: processLabel(process),
            status: process.status,
          })),
          selectedProcessId: selected.id,
          routeVersion: route.versionNumber,
          steps: steps.map((step) => timelineStep(step, actorOf(step, usernames), now)),
        },
      };
    });
  }
}

/** Pelaku: user yang tercatat, sistem untuk langkah otomatis, kosong untuk langkah yang belum dikerjakan. */
function actorOf(step: StepRow, users: Map<string, { username: string }>): StepActor | null {
  const user = step.actorUserId ? users.get(step.actorUserId) : undefined;
  if (user) return { type: "USER", username: user.username };
  if (!step.startedAt || step.status === "WAITING_HUMAN") return null;
  return { type: "SYSTEM" };
}

/** Langkah yang sudah mulai tetapi belum selesai memakai hari ini untuk aging (api-specs 13 §13.2 langkah 3). */
function timelineStep(step: StepRow, actor: StepActor | null, now: Date): TimelineStep {
  const aging = step.aging
    ? new Decimal(step.aging).toString()
    : step.startedAt && !step.endedAt
      ? calendarDayAging(step.startedAt, now)
      : null;
  return {
    stepExecutionId: step.id,
    stepCode: step.stepCode,
    status: step.status,
    skipReason: step.skipReason,
    outcomeCode: step.outcomeCode,
    attempt: step.attempt,
    startedAt: step.startedAt?.toISOString() ?? null,
    endedAt: step.endedAt?.toISOString() ?? null,
    aging,
    actor,
    summary: step.summary,
    errorMessage: step.errorMessage,
  };
}
