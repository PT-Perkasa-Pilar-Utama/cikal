import { Module } from "@nestjs/common";
import { ApplicationProcess } from "./application/application-process.js";
import { ApplicationsRepository } from "./db/applications.repository.js";

/** Application: draft, section, submit, detail (technical-specs 05 §5.10). */
@Module({
  providers: [ApplicationsRepository, ApplicationProcess],
  exports: [ApplicationProcess],
})
export class ApplicationModule {}
