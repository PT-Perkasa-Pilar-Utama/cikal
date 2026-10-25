import {
  type ApprovalHierarchyListResponse,
  approvalHierarchyCreateSchema,
  approvalHierarchyListQuerySchema,
  approvalHierarchyUpdateSchema,
  type ChangeRequestAccepted,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListHierarchiesUseCase } from "../application/list-hierarchies.use-case.js";
import { RequestHierarchyCreateUseCase } from "../application/request-hierarchy-create.use-case.js";
import { RequestHierarchyUpdateUseCase } from "../application/request-hierarchy-update.use-case.js";

class ApprovalHierarchyListQueryDto extends createZodDto(approvalHierarchyListQuerySchema) {}
class ApprovalHierarchyCreateDto extends createZodDto(approvalHierarchyCreateSchema) {}
class ApprovalHierarchyUpdateDto extends createZodDto(approvalHierarchyUpdateSchema) {}

/** Approval Hierarchy lewat checker-maker (api-specs 16 §16.1 s.d. §16.3, US-27). */
@Controller("v1/approval-hierarchies")
export class ApprovalHierarchiesController {
  constructor(
    private readonly lists: ListHierarchiesUseCase,
    private readonly creates: RequestHierarchyCreateUseCase,
    private readonly updates: RequestHierarchyUpdateUseCase,
  ) {}

  @Get()
  @Requires("MST-APPROVAL", "VIEW")
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ApprovalHierarchyListQueryDto,
  ): Promise<ApprovalHierarchyListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post()
  @HttpCode(202)
  @Requires("MST-APPROVAL", "CREATE")
  create(
    @CurrentContext() ctx: RequestContext,
    @Body() body: ApprovalHierarchyCreateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.creates.execute(ctx, body);
  }

  @Put(":id")
  @HttpCode(202)
  @Requires("MST-APPROVAL", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ApprovalHierarchyUpdateDto,
  ): Promise<ChangeRequestAccepted> {
    return this.updates.execute(ctx, id, body);
  }
}
