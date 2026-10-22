import { Global, Module } from "@nestjs/common";
import { CHANGE_REQUEST_PORT } from "../../../platform/http/change-request-port.js";
import { AuditModule } from "../audit/index.js";
import { ApproveChangeRequestUseCase } from "./application/approve-change-request.use-case.js";
import { ChangeRequestService } from "./application/change-request-port.js";
import { ChangeRequestRegistry } from "./application/change-request-registry.js";
import { GetChangeRequestUseCase } from "./application/get-change-request.use-case.js";
import { ListChangeRequestsUseCase } from "./application/list-change-requests.use-case.js";
import { RejectChangeRequestUseCase } from "./application/reject-change-request.use-case.js";
import { ReviewGate } from "./application/review-gate.js";
import { SubmitChangeRequest } from "./application/submit-change-request.js";
import { ChangeRequestsRepository } from "./db/change-requests.repository.js";
import { ChangeRequestsController } from "./http/change-requests.controller.js";

/**
 * Change Request: checker-maker untuk semua data master (technical-specs 05 §5.6). Global karena mendaftarkan
 * port platform `CHANGE_REQUEST_PORT`: modul pemilik data mengajukan perubahan dan mendaftarkan handler lewat
 * port itu tanpa mengimpor modul ini, sehingga Change Request tetap boleh merujuk tabel `iam.users`.
 */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [ChangeRequestsController],
  providers: [
    ChangeRequestsRepository,
    ChangeRequestRegistry,
    ChangeRequestService,
    ReviewGate,
    SubmitChangeRequest,
    ListChangeRequestsUseCase,
    GetChangeRequestUseCase,
    ApproveChangeRequestUseCase,
    RejectChangeRequestUseCase,
    { provide: CHANGE_REQUEST_PORT, useExisting: ChangeRequestService },
  ],
  exports: [CHANGE_REQUEST_PORT],
})
export class ChangeRequestModule {}
