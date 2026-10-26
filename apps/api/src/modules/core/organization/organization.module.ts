import { Module } from "@nestjs/common";
import { BranchDirectory } from "./application/branch-directory.js";
import { ListUnitsUseCase } from "./application/list-units.use-case.js";
import { UnitAccess } from "./application/unit-access.js";
import { BranchesRepository } from "./db/branches.repository.js";
import { RegionalsRepository } from "./db/regionals.repository.js";
import { SubBranchesRepository } from "./db/sub-branches.repository.js";
import { OrganizationController } from "./http/organization.controller.js";

/** Organization: regional, cabang, sub cabang, mata uang (technical-specs 05 §5.3). */
@Module({
  controllers: [OrganizationController],
  providers: [
    RegionalsRepository,
    BranchesRepository,
    SubBranchesRepository,
    UnitAccess,
    ListUnitsUseCase,
    BranchDirectory,
  ],
  exports: [BranchDirectory],
})
export class OrganizationModule {}
