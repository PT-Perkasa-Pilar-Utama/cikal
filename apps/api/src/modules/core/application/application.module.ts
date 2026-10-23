import { Module } from "@nestjs/common";
import { ApplicationProcess } from "./application/application-process.js";
import { LoanIds } from "./application/loan-ids.js";
import { ApplicationsRepository } from "./db/applications.repository.js";
import { LoanIdCountersRepository } from "./db/loan-id-counters.repository.js";

/** Application: draft, section, submit, detail (technical-specs 05 §5.10). */
@Module({
  providers: [ApplicationsRepository, ApplicationProcess, LoanIdCountersRepository, LoanIds],
  exports: [ApplicationProcess],
})
export class ApplicationModule {}
