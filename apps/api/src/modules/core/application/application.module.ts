import { Module } from "@nestjs/common";
import { DocumentModule } from "../document/index.js";
import { OrganizationModule } from "../organization/index.js";
import { ProductModule } from "../product/index.js";
import { ApplicationContacts } from "./application/application-contacts.js";
import { ApplicationFactsReader } from "./application/application-facts.js";
import { ApplicationFileAccess } from "./application/application-file-access.js";
import { ApplicationIdentities } from "./application/application-identities.js";
import { ApplicationProcess } from "./application/application-process.js";
import { ApplicationSectionChecks } from "./application/application-section-checks.js";
import { DraftDocuments } from "./application/draft-documents.js";
import { DraftFormSections } from "./application/draft-form-sections.js";
import { DraftSections } from "./application/draft-sections.js";
import { GetDraftFormUseCase } from "./application/get-draft-form.use-case.js";
import { ListApplicationDocumentsUseCase } from "./application/list-application-documents.use-case.js";
import { ListDraftsUseCase } from "./application/list-drafts.use-case.js";
import { LoanIds } from "./application/loan-ids.js";
import { SaveApplicationSectionUseCase } from "./application/save-application-section.use-case.js";
import { SaveDraftUseCase } from "./application/save-draft.use-case.js";
import { SaveEmergencyContactSectionUseCase } from "./application/save-emergency-contact-section.use-case.js";
import { SaveOccupationSectionUseCase } from "./application/save-occupation-section.use-case.js";
import { SavePersonalSectionUseCase } from "./application/save-personal-section.use-case.js";
import { StrictSections } from "./application/strict-sections.js";
import { SubmitApplicationUseCase } from "./application/submit-application.use-case.js";
import { UploadApplicationDocumentUseCase } from "./application/upload-application-document.use-case.js";
import { ApplicantLookupRepository } from "./db/applicant-lookup.repository.js";
import { ApplicationAddressesRepository } from "./db/application-addresses.repository.js";
import { ApplicationDocumentsRepository } from "./db/application-documents.repository.js";
import { ApplicationEmergencyContactsRepository } from "./db/application-emergency-contacts.repository.js";
import { ApplicationFactsRepository } from "./db/application-facts.repository.js";
import { ApplicationOccupationsRepository } from "./db/application-occupations.repository.js";
import { ApplicationPersonalsRepository } from "./db/application-personals.repository.js";
import { ApplicationsRepository } from "./db/applications.repository.js";
import { LoanIdCountersRepository } from "./db/loan-id-counters.repository.js";
import { ApplicationDocumentsController } from "./http/application-documents.controller.js";
import { ApplicationSectionsController } from "./http/application-sections.controller.js";
import { ApplicationsController } from "./http/applications.controller.js";

/** Application: draft, section, submit, detail (technical-specs 05 §5.10). */
@Module({
  imports: [DocumentModule, OrganizationModule, ProductModule],
  controllers: [ApplicationsController, ApplicationSectionsController, ApplicationDocumentsController],
  providers: [
    ApplicationsRepository,
    ApplicationPersonalsRepository,
    ApplicationAddressesRepository,
    ApplicationOccupationsRepository,
    ApplicationEmergencyContactsRepository,
    ApplicationDocumentsRepository,
    ApplicationProcess,
    ApplicationContacts,
    ApplicationIdentities,
    ApplicantLookupRepository,
    ApplicationFactsReader,
    ApplicationFactsRepository,
    LoanIdCountersRepository,
    LoanIds,
    DraftSections,
    DraftFormSections,
    DraftDocuments,
    StrictSections,
    ApplicationFileAccess,
    ApplicationSectionChecks,
    SaveDraftUseCase,
    SaveApplicationSectionUseCase,
    SavePersonalSectionUseCase,
    SaveOccupationSectionUseCase,
    SaveEmergencyContactSectionUseCase,
    ListDraftsUseCase,
    GetDraftFormUseCase,
    ListApplicationDocumentsUseCase,
    UploadApplicationDocumentUseCase,
    SubmitApplicationUseCase,
  ],
  exports: [ApplicationProcess, ApplicationContacts, ApplicationIdentities, ApplicationFactsReader],
})
export class ApplicationModule {}
