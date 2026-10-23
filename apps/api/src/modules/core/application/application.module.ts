import { Module } from "@nestjs/common";
import { ProductModule } from "../product/index.js";
import { ApplicationProcess } from "./application/application-process.js";
import { ApplicationSectionChecks } from "./application/application-section-checks.js";
import { DraftFormSections } from "./application/draft-form-sections.js";
import { DraftSections } from "./application/draft-sections.js";
import { GetDraftFormUseCase } from "./application/get-draft-form.use-case.js";
import { ListDraftsUseCase } from "./application/list-drafts.use-case.js";
import { LoanIds } from "./application/loan-ids.js";
import { SaveApplicationSectionUseCase } from "./application/save-application-section.use-case.js";
import { SaveDraftUseCase } from "./application/save-draft.use-case.js";
import { SaveEmergencyContactSectionUseCase } from "./application/save-emergency-contact-section.use-case.js";
import { SaveOccupationSectionUseCase } from "./application/save-occupation-section.use-case.js";
import { SavePersonalSectionUseCase } from "./application/save-personal-section.use-case.js";
import { ApplicationAddressesRepository } from "./db/application-addresses.repository.js";
import { ApplicationEmergencyContactsRepository } from "./db/application-emergency-contacts.repository.js";
import { ApplicationOccupationsRepository } from "./db/application-occupations.repository.js";
import { ApplicationPersonalsRepository } from "./db/application-personals.repository.js";
import { ApplicationsRepository } from "./db/applications.repository.js";
import { LoanIdCountersRepository } from "./db/loan-id-counters.repository.js";
import { ApplicationSectionsController } from "./http/application-sections.controller.js";
import { ApplicationsController } from "./http/applications.controller.js";

/** Application: draft, section, submit, detail (technical-specs 05 §5.10). */
@Module({
  imports: [ProductModule],
  controllers: [ApplicationsController, ApplicationSectionsController],
  providers: [
    ApplicationsRepository,
    ApplicationPersonalsRepository,
    ApplicationAddressesRepository,
    ApplicationOccupationsRepository,
    ApplicationEmergencyContactsRepository,
    ApplicationProcess,
    LoanIdCountersRepository,
    LoanIds,
    DraftSections,
    DraftFormSections,
    ApplicationSectionChecks,
    SaveDraftUseCase,
    SaveApplicationSectionUseCase,
    SavePersonalSectionUseCase,
    SaveOccupationSectionUseCase,
    SaveEmergencyContactSectionUseCase,
    ListDraftsUseCase,
    GetDraftFormUseCase,
  ],
  exports: [ApplicationProcess],
})
export class ApplicationModule {}
