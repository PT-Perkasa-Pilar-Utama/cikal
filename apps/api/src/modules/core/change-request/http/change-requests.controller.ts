import {
  type ChangeRequestDetailResponse,
  type ChangeRequestListResponse,
  type ChangeRequestReviewResponse,
  changeRequestListQuerySchema,
  changeRequestReviewRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ApproveChangeRequestUseCase } from "../application/approve-change-request.use-case.js";
import { GetChangeRequestUseCase } from "../application/get-change-request.use-case.js";
import { ListChangeRequestsUseCase } from "../application/list-change-requests.use-case.js";
import { RejectChangeRequestUseCase } from "../application/reject-change-request.use-case.js";

class ChangeRequestListQueryDto extends createZodDto(changeRequestListQuerySchema) {}
class ChangeRequestReviewDto extends createZodDto(changeRequestReviewRequestSchema) {}

/**
 * Sisi Checker (api-specs 07 §7.2 s.d. §7.5). Hak menu bergantung pada `entityType` (api-specs 07 §7.1), jadi
 * diperiksa di use case, bukan lewat `@Requires`.
 */
@Controller("v1/change-requests")
export class ChangeRequestsController {
  constructor(
    private readonly lists: ListChangeRequestsUseCase,
    private readonly details: GetChangeRequestUseCase,
    private readonly approvals: ApproveChangeRequestUseCase,
    private readonly rejections: RejectChangeRequestUseCase,
  ) {}

  @Get()
  @Authenticated()
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ChangeRequestListQueryDto,
  ): Promise<ChangeRequestListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Get(":id")
  @Authenticated()
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ChangeRequestDetailResponse> {
    return this.details.execute(ctx, id);
  }

  @Post(":id/approve")
  @HttpCode(200)
  @Authenticated()
  approve(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ChangeRequestReviewDto,
  ): Promise<ChangeRequestReviewResponse> {
    return this.approvals.execute(ctx, id, body);
  }

  @Post(":id/reject")
  @HttpCode(200)
  @Authenticated()
  reject(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ChangeRequestReviewDto,
  ): Promise<ChangeRequestReviewResponse> {
    return this.rejections.execute(ctx, id, body);
  }
}
