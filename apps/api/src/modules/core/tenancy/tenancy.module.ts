import { Module } from "@nestjs/common";
import { CompanyDirectory } from "./application/company-directory.js";
import { GetLicenseUseCase } from "./application/get-license.use-case.js";
import { InstallLicenseUseCase } from "./application/install-license.use-case.js";
import { Licensing } from "./application/licensing.js";
import { CompaniesRepository } from "./db/companies.repository.js";
import { LicensesRepository } from "./db/licenses.repository.js";
import { ModuleEntitlementsRepository } from "./db/module-entitlements.repository.js";
import { LicenseController } from "./http/license.controller.js";

/** Tenant & License: company, lisensi modul, salin konfigurasi (technical-specs 05 §5.2). */
@Module({
  controllers: [LicenseController],
  providers: [
    CompaniesRepository,
    LicensesRepository,
    ModuleEntitlementsRepository,
    CompanyDirectory,
    Licensing,
    GetLicenseUseCase,
    InstallLicenseUseCase,
  ],
  exports: [CompanyDirectory, Licensing],
})
export class TenancyModule {}
