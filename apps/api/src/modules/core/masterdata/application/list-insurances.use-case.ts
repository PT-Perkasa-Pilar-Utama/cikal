import type { InsuranceListQuery, InsuranceListResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { InsurancesRepository } from "../db/insurances.repository.js";

/** Dropdown "Insurance" step Application (api-specs 06 §6.2): View pada `APP-ENTRY` atau `MST-PARAMETER`. */
@Injectable()
export class ListInsurancesUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly insurances: InsurancesRepository,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  async execute(ctx: RequestContext, query: InsuranceListQuery): Promise<InsuranceListResponse> {
    if (!(await this.access.allows(ctx, "MST-PARAMETER", "VIEW"))) {
      await this.access.authorize(ctx, "APP-ENTRY", "VIEW");
    }
    return this.db.withTenantTx(ctx, async (tx) => ({
      data: await this.insurances.list(tx, query.includeInactive),
    }));
  }
}
