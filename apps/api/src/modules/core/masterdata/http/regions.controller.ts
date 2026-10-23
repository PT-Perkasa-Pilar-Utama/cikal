import {
  cityOptionsQuerySchema,
  districtOptionsQuerySchema,
  provinceOptionsQuerySchema,
  type RegionOptionsResponse,
  type RegionSearchResponse,
  type RegionSyncStartedResponse,
  type RegionSyncStateResponse,
  regionSearchQuerySchema,
  type SubDistrictOptionsResponse,
  subDistrictOptionsQuerySchema,
} from "@cikal/contracts";
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetRegionSyncUseCase } from "../application/get-region-sync.use-case.js";
import { ListRegionOptionsUseCase } from "../application/list-region-options.use-case.js";
import { SearchRegionsUseCase } from "../application/search-regions.use-case.js";
import { StartRegionSyncUseCase } from "../application/start-region-sync.use-case.js";

class ProvinceOptionsQueryDto extends createZodDto(provinceOptionsQuerySchema) {}
class CityOptionsQueryDto extends createZodDto(cityOptionsQuerySchema) {}
class DistrictOptionsQueryDto extends createZodDto(districtOptionsQuerySchema) {}
class SubDistrictOptionsQueryDto extends createZodDto(subDistrictOptionsQuerySchema) {}
class RegionSearchQueryDto extends createZodDto(regionSearchQuerySchema) {}

/**
 * Data wilayah (api-specs 06 §6.3). Dropdown memakai `@Authenticated()` karena boleh dengan View pada
 * `MST-REGION` atau `APP-ENTRY`; use case memeriksa haknya.
 */
@Controller("v1/regions")
export class RegionsController {
  constructor(
    private readonly options: ListRegionOptionsUseCase,
    private readonly searches: SearchRegionsUseCase,
    private readonly starts: StartRegionSyncUseCase,
    private readonly syncs: GetRegionSyncUseCase,
  ) {}

  @Get("provinces")
  @Authenticated()
  provinces(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ProvinceOptionsQueryDto,
  ): Promise<RegionOptionsResponse> {
    return this.options.provinces(ctx, query);
  }

  @Get("cities")
  @Authenticated()
  cities(@CurrentContext() ctx: RequestContext, @Query() query: CityOptionsQueryDto): Promise<RegionOptionsResponse> {
    return this.options.cities(ctx, query);
  }

  @Get("districts")
  @Authenticated()
  districts(
    @CurrentContext() ctx: RequestContext,
    @Query() query: DistrictOptionsQueryDto,
  ): Promise<RegionOptionsResponse> {
    return this.options.districts(ctx, query);
  }

  @Get("sub-districts")
  @Authenticated()
  subDistricts(
    @CurrentContext() ctx: RequestContext,
    @Query() query: SubDistrictOptionsQueryDto,
  ): Promise<SubDistrictOptionsResponse> {
    return this.options.subDistricts(ctx, query);
  }

  @Get("search")
  @Requires("MST-REGION", "VIEW")
  search(@CurrentContext() ctx: RequestContext, @Query() query: RegionSearchQueryDto): Promise<RegionSearchResponse> {
    return this.searches.execute(ctx, query);
  }

  @Post("sync")
  @HttpCode(202)
  @Requires("MST-REGION", "UPDATE")
  startSync(@CurrentContext() ctx: RequestContext): Promise<RegionSyncStartedResponse> {
    return this.starts.execute(ctx);
  }

  @Get("sync/:syncId")
  @Requires("MST-REGION", "VIEW")
  sync(
    @CurrentContext() ctx: RequestContext,
    @Param("syncId", ParseUUIDPipe) syncId: string,
  ): Promise<RegionSyncStateResponse> {
    return this.syncs.execute(ctx, syncId);
  }
}
