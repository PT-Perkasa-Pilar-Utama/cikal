import {
  type BranchListResponse,
  branchListQuerySchema,
  type RegionalListResponse,
  regionalListQuerySchema,
  type SubBranchListResponse,
  subBranchListQuerySchema,
} from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListUnitsUseCase } from "../application/list-units.use-case.js";

class RegionalListQueryDto extends createZodDto(regionalListQuerySchema) {}
class BranchListQueryDto extends createZodDto(branchListQuerySchema) {}
class SubBranchListQueryDto extends createZodDto(subBranchListQuerySchema) {}

/**
 * Dropdown unit organisasi (api-specs 05 §5.1, §5.2). Hak dibaca di use case karena View pada salah satu dari
 * beberapa menu sudah cukup.
 */
@Controller("v1")
export class OrganizationController {
  constructor(private readonly units: ListUnitsUseCase) {}

  @Get("regionals")
  @Authenticated()
  regionals(
    @CurrentContext() ctx: RequestContext,
    @Query() query: RegionalListQueryDto,
  ): Promise<RegionalListResponse> {
    return this.units.listRegionals(ctx, query);
  }

  @Get("branches")
  @Authenticated()
  branches(@CurrentContext() ctx: RequestContext, @Query() query: BranchListQueryDto): Promise<BranchListResponse> {
    return this.units.listBranches(ctx, query);
  }

  @Get("branches/:id/sub-branches")
  @Authenticated()
  subBranches(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: SubBranchListQueryDto,
  ): Promise<SubBranchListResponse> {
    return this.units.listSubBranches(ctx, id, query);
  }
}
