import { stepCodes } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ApplicationProcess, type ProcessApplication } from "../../application/index.js";
import { ProductRoutes, ProductTerms } from "../../product/index.js";
import { ProcessInstancesRepository, type ProcessRow } from "../db/process-instances.repository.js";
import { StepExecutionsRepository, type StepInsert } from "../db/step-executions.repository.js";
import { calendarDayAging } from "../domain/aging.js";
import { processError } from "../domain/process-errors.js";
import { ProcessJobs } from "./process-jobs.js";

/**
 * `start(applicationId)` (technical-specs 12 §12.6) di transaksi submit (api-specs 12 §12.8 langkah 5): versi rute
 * ACTIVE, versi rumus, dan snapshot parameter dikunci di ProcessInstance (RT-06, FM-05, PR-06); DATA_ENTRY
 * `COMPLETED`; langkah lain `PENDING`; job `advance` pertama ikut transaksi.
 */
@Injectable()
export class StartProcess {
  constructor(
    private readonly applications: ApplicationProcess,
    private readonly routes: ProductRoutes,
    private readonly terms: ProductTerms,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
    private readonly processes: ProcessInstancesRepository,
    private readonly steps: StepExecutionsRepository,
    private readonly jobs: ProcessJobs,
  ) {}

  async execute(tx: Tx, applicationId: string): Promise<{ processInstanceId: string }> {
    const application = await this.applications.find(tx, applicationId);
    if (!application) throw processError("APPLICATION_NOT_FOUND");
    if (application.status !== "ON_PROGRESS" || (await this.processes.hasActive(tx, applicationId))) {
      throw DomainError.standard("INVALID_STATE");
    }
    const route = await this.routes.activeRoute(tx, application.productId);
    if (!route) throw processError("PRODUCT_NOT_AVAILABLE");

    const submittedAt = application.submittedAt ?? new Date();
    const process: ProcessRow = {
      id: uuidv7(),
      tenantId: application.tenantId,
      applicationId,
      recontestNumber: 0,
      routeVersionId: route.id,
      // Belum ada versi rumus tenant: POC memakai rumus default bawaan (TL-S4-01, FM-12).
      formulaVersions: {},
      parameterSnapshot: {
        ...(await this.parameters.snapshotLocked(tx, application.productId)),
        ...(await this.terms.snapshot(tx, application.productId, businessDate(submittedAt))),
      },
      status: "RUNNING",
      startedAt: submittedAt,
    };
    await this.processes.insert(tx, { ...process, createdBy: application.submittedBy });
    await this.steps.insert(tx, initialSteps(process, application, submittedAt));
    await this.jobs.advance(tx, process);
    return { processInstanceId: process.id };
  }
}

/** DATA_ENTRY mulai saat draft dan selesai saat submit oleh pembuatnya (tech ref 6.3); langkah lain menunggu. */
function initialSteps(process: ProcessRow, application: ProcessApplication, submittedAt: Date): StepInsert[] {
  return stepCodes.map((stepCode) => {
    const row = { id: uuidv7(), tenantId: process.tenantId, processInstanceId: process.id, stepCode, attempt: 1 };
    if (stepCode !== "DATA_ENTRY") return { ...row, status: "PENDING" };
    return {
      ...row,
      status: "COMPLETED",
      actorUserId: application.submittedBy,
      startedAt: application.createdAt,
      endedAt: submittedAt,
      aging: calendarDayAging(application.createdAt, submittedAt),
    };
  });
}
