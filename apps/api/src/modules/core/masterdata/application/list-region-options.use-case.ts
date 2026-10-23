import type {
  CityOptionsQuery,
  DistrictOptionsQuery,
  ProvinceOptionsQuery,
  RegionOptionsResponse,
  SubDistrictOptionsQuery,
  SubDistrictOptionsResponse,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { RegionsRepository } from "../db/regions.repository.js";

/** Dropdown alamat berjenjang (api-specs 06 §6.3.1, AC-23.04): View pada Region Data atau pada entri pengajuan. */
@Injectable()
export class ListRegionOptionsUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly regions: RegionsRepository,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  provinces(ctx: RequestContext, query: ProvinceOptionsQuery): Promise<RegionOptionsResponse> {
    return this.read(ctx, async (tx) => ({ data: await this.regions.provinces(tx, query.q) }));
  }

  cities(ctx: RequestContext, query: CityOptionsQuery): Promise<RegionOptionsResponse> {
    return this.read(ctx, async (tx) => ({ data: await this.regions.cities(tx, query.provinceCode, query.q) }));
  }

  districts(ctx: RequestContext, query: DistrictOptionsQuery): Promise<RegionOptionsResponse> {
    return this.read(ctx, async (tx) => ({ data: await this.regions.districts(tx, query.cityCode, query.q) }));
  }

  subDistricts(ctx: RequestContext, query: SubDistrictOptionsQuery): Promise<SubDistrictOptionsResponse> {
    return this.read(ctx, async (tx) => ({ data: await this.regions.subDistricts(tx, query.districtCode, query.q) }));
  }

  private async read<T>(ctx: RequestContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!(await this.access.allows(ctx, "MST-REGION", "VIEW"))) await this.access.authorize(ctx, "APP-ENTRY", "VIEW");
    return this.db.withTenantTx(ctx, fn);
  }
}
