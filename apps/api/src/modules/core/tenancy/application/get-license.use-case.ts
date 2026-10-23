import { type LicenseResponse, moduleNames } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { Licensing } from "./licensing.js";

/** `GET /license` (api-specs 04 §4.1): lisensi company sesi dari cache yang sudah diverifikasi (LC-04). */
@Injectable()
export class GetLicenseUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly licensing: Licensing,
  ) {}

  async execute(ctx: RequestContext): Promise<LicenseResponse> {
    const state = await this.db.withTenantTx(ctx, (tx) => this.licensing.state(tx));
    if (state.status === "NONE") throw DomainError.standard("NOT_FOUND", "No license is installed");
    const { license } = state;
    return {
      data: {
        licenseNumber: license.licenseNumber,
        companyCode: license.companyCode,
        deploymentType: license.deploymentType,
        validFrom: license.validFrom,
        validTo: license.validTo,
        status: state.status,
        maxUsers: license.maxUsers,
        modules: license.modules.map((moduleCode) => ({ moduleCode, moduleName: moduleNames[moduleCode] })),
        installedAt: state.installedAt.toISOString(),
      },
    };
  }
}
