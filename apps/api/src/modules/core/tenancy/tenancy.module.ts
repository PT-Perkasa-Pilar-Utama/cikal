import { Module } from "@nestjs/common";
import { CompanyDirectory } from "./application/company-directory.js";
import { CompaniesRepository } from "./db/companies.repository.js";

/** Tenant & License: company, lisensi modul, salin konfigurasi (technical-specs 05 §5.2). */
@Module({
  providers: [CompaniesRepository, CompanyDirectory],
  exports: [CompanyDirectory],
})
export class TenancyModule {}
