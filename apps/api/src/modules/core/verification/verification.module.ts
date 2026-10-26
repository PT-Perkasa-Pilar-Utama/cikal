import { Module, type OnModuleInit } from "@nestjs/common";
import { ApplicationModule } from "../application/index.js";
import { DocumentModule } from "../document/index.js";
import { OrchestratorModule, StepHandlerRegistry } from "../orchestrator/index.js";
import { TaskQueueModule } from "../task-queue/index.js";
import { GetVerificationUseCase } from "./application/get-verification.use-case.js";
import { SaveVerificationUseCase } from "./application/save-verification.use-case.js";
import { VerificationCases } from "./application/verification-cases.js";
import { VerificationFileAccess } from "./application/verification-file-access.js";
import { VerificationStepHandler } from "./application/verification-step-handler.js";
import { DocumentVerificationsRepository } from "./db/document-verifications.repository.js";
import { VerificationController } from "./http/verification.controller.js";

/** Verification: verifikasi dokumen pengajuan (technical-specs 05 §5.13). */
@Module({
  imports: [ApplicationModule, DocumentModule, OrchestratorModule, TaskQueueModule],
  controllers: [VerificationController],
  providers: [
    DocumentVerificationsRepository,
    VerificationCases,
    VerificationStepHandler,
    VerificationFileAccess,
    GetVerificationUseCase,
    SaveVerificationUseCase,
  ],
})
export class VerificationModule implements OnModuleInit {
  constructor(
    private readonly steps: StepHandlerRegistry,
    private readonly handler: VerificationStepHandler,
  ) {}

  /** StepHandler `VERIFICATION` (technical-specs 12 §12.2). */
  onModuleInit(): void {
    this.steps.register(this.handler);
  }
}
