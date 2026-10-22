import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/index.js";
import { ApproveChangeRequestUseCase } from "./application/approve-change-request.use-case.js";
import { ChangeRequestRegistry } from "./application/change-request-registry.js";
import { GetChangeRequestUseCase } from "./application/get-change-request.use-case.js";
import { ListChangeRequestsUseCase } from "./application/list-change-requests.use-case.js";
import { PendingChanges } from "./application/pending-changes.js";
import { RejectChangeRequestUseCase } from "./application/reject-change-request.use-case.js";
import { ReviewGate } from "./application/review-gate.js";
import { SubmitChangeRequest } from "./application/submit-change-request.js";
import { ChangeRequestsRepository } from "./db/change-requests.repository.js";
import { ChangeRequestsController } from "./http/change-requests.controller.js";

/**
 * Change Request: checker-maker untuk semua data master (technical-specs 05 §5.6). Modul pemilik data mengimpor
 * modul ini untuk `SubmitChangeRequest` dan mendaftarkan handler di `ChangeRequestRegistry`.
 */
@Module({
  imports: [AuditModule],
  controllers: [ChangeRequestsController],
  providers: [
    ChangeRequestsRepository,
    ChangeRequestRegistry,
    PendingChanges,
    ReviewGate,
    SubmitChangeRequest,
    ListChangeRequestsUseCase,
    GetChangeRequestUseCase,
    ApproveChangeRequestUseCase,
    RejectChangeRequestUseCase,
  ],
  exports: [ChangeRequestRegistry, PendingChanges, SubmitChangeRequest],
})
export class ChangeRequestModule {}
