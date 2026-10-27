import { Module } from "@nestjs/common";
import { OrganizationModule } from "../organization/index.js";
import { ListApplicationsUseCase } from "./application/list-applications.use-case.js";
import { ApplicationInquiryRepository } from "./db/application-inquiry.repository.js";
import { ApplicationsInquiryController } from "./http/applications-inquiry.controller.js";

/** Reporting: inquiry, dashboard, ekspor lewat view skema `reporting` (technical-specs 05 §5.17). */
@Module({
  imports: [OrganizationModule],
  controllers: [ApplicationsInquiryController],
  providers: [ApplicationInquiryRepository, ListApplicationsUseCase],
})
export class ReportingModule {}
