import { Module } from "@nestjs/common";
import { ProductModule } from "../product/index.js";
import { ApplicationProcess } from "./application/application-process.js";
import { GetDraftFormUseCase } from "./application/get-draft-form.use-case.js";
import { ListDraftsUseCase } from "./application/list-drafts.use-case.js";
import { LoanIds } from "./application/loan-ids.js";
import { SaveDraftUseCase } from "./application/save-draft.use-case.js";
import { ApplicationPersonalsRepository } from "./db/application-personals.repository.js";
import { ApplicationsRepository } from "./db/applications.repository.js";
import { LoanIdCountersRepository } from "./db/loan-id-counters.repository.js";
import { ApplicationsController } from "./http/applications.controller.js";

/** Application: draft, section, submit, detail (technical-specs 05 §5.10). */
@Module({
  imports: [ProductModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsRepository,
    ApplicationPersonalsRepository,
    ApplicationProcess,
    LoanIdCountersRepository,
    LoanIds,
    SaveDraftUseCase,
    ListDraftsUseCase,
    GetDraftFormUseCase,
  ],
  exports: [ApplicationProcess],
})
export class ApplicationModule {}
