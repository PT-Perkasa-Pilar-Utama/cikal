import { Module } from "@nestjs/common";
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
import { RetryStepUseCase } from "./application/retry-step.use-case.js";
import { StartProcess } from "./application/start-process.js";
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

/** Orchestrator: rute langkah, retry, recontest (technical-specs 05 §5.11, 12). */
@Module({
  imports: [ApplicationModule, AuditModule, ProductModule, TenancyModule],
  controllers: [ProcessesController, ProcessMonitoringController],
  providers: [
    ProcessInstancesRepository,
    StepExecutionsRepository,
    ProcessMonitoringRepository,
    StepHandlerRegistry,
    ProcessJobs,
    StepResults,
    StepRunner,
    StartProcess,
    AdvanceProcess,
    WaitingSteps,
    OrchestratorApi,
    GetProcessTimelineUseCase,
    ProcessMonitoring,
    ListProcessMonitoringUseCase,
    RetryStepUseCase,
    FinishProcessUseCase,
    AdvanceJob,
    WaitDeadlineJob,
  ],
  exports: [OrchestratorApi, StepHandlerRegistry],
})
export class OrchestratorModule {}
