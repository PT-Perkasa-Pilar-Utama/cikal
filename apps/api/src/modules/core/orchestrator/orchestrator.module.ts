import { Global, Module } from "@nestjs/common";
import { PROCESS_START_PORT } from "../../../platform/http/process-start-port.js";
import { ApplicationModule } from "../application/index.js";
import { AuditModule } from "../audit/index.js";
import { ProductModule } from "../product/index.js";
import { TenancyModule } from "../tenancy/index.js";
import { AdvanceProcess } from "./application/advance-process.js";
import { FinishProcessUseCase } from "./application/finish-process.use-case.js";
import { GetProcessTimelineUseCase } from "./application/get-process-timeline.use-case.js";
import { ListProcessMonitoringUseCase } from "./application/list-process-monitoring.use-case.js";
import { ProcessMonitoring } from "./application/monitoring.js";
import { OrchestratorApi } from "./application/orchestrator-api.js";
import { ProcessJobs } from "./application/process-jobs.js";
import { ProcessOutlook } from "./application/process-outlook.js";
import { RetryStepUseCase } from "./application/retry-step.use-case.js";
import { StartProcess } from "./application/start-process.js";
import { StepEvents } from "./application/step-events.js";
import { StepHandlerRegistry } from "./application/step-handler.js";
import { StepResults } from "./application/step-results.js";
import { StepRunner } from "./application/step-runner.js";
import { WaitingSteps } from "./application/waiting-steps.js";
import { ProcessInstancesRepository } from "./db/process-instances.repository.js";
import { ProcessMonitoringRepository } from "./db/process-monitoring.repository.js";
import { StepExecutionsRepository } from "./db/step-executions.repository.js";
import { ProcessMonitoringController } from "./http/process-monitoring.controller.js";
import { ProcessesController } from "./http/processes.controller.js";
import { AdvanceJob } from "./jobs/advance.job.js";
import { WaitDeadlineJob } from "./jobs/wait-deadline.job.js";

/**
 * Orchestrator: rute langkah, retry, recontest (technical-specs 05 §5.11, 12). Global karena mendaftarkan port
 * platform `PROCESS_START_PORT`: submit pengajuan memulai proses tanpa modul Application mengimpor modul ini.
 */
@Global()
@Module({
  imports: [ApplicationModule, AuditModule, ProductModule, TenancyModule],
  controllers: [ProcessesController, ProcessMonitoringController],
  providers: [
    ProcessInstancesRepository,
    StepExecutionsRepository,
    ProcessMonitoringRepository,
    StepHandlerRegistry,
    ProcessJobs,
    StepEvents,
    StepResults,
    StepRunner,
    StartProcess,
    AdvanceProcess,
    WaitingSteps,
    ProcessOutlook,
    OrchestratorApi,
    GetProcessTimelineUseCase,
    ProcessMonitoring,
    ListProcessMonitoringUseCase,
    RetryStepUseCase,
    FinishProcessUseCase,
    AdvanceJob,
    WaitDeadlineJob,
    { provide: PROCESS_START_PORT, useExisting: OrchestratorApi },
  ],
  exports: [OrchestratorApi, StepHandlerRegistry, PROCESS_START_PORT],
})
export class OrchestratorModule {}
