import {
  type TaskListResponse,
  type TaskStateResponse,
  taskListQuerySchema,
  taskVersionRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { AssignTaskUseCase } from "../application/assign-task.use-case.js";
import { ListTasksUseCase } from "../application/list-tasks.use-case.js";
import { ReleaseTaskUseCase } from "../application/release-task.use-case.js";

class TaskListQueryDto extends createZodDto(taskListQuerySchema) {}
class TaskVersionDto extends createZodDto(taskVersionRequestSchema) {}

/**
 * Antrean tugas manusia (api-specs 14 §14.2 s.d. §14.4). Menu yang diperiksa bergantung pada antrean tugas
 * (api-specs 14 §14.1), jadi hak menu diperiksa use case, bukan dekorator.
 */
@Controller("v1/tasks")
export class TasksController {
  constructor(
    private readonly lists: ListTasksUseCase,
    private readonly assigns: AssignTaskUseCase,
    private readonly releases: ReleaseTaskUseCase,
  ) {}

  @Get()
  @Authenticated()
  list(@CurrentContext() ctx: RequestContext, @Query() query: TaskListQueryDto): Promise<TaskListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Post(":id/assign")
  @HttpCode(200)
  @Authenticated()
  assign(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: TaskVersionDto,
  ): Promise<TaskStateResponse> {
    return this.assigns.execute(ctx, id, body);
  }

  @Post(":id/release")
  @HttpCode(200)
  @Authenticated()
  release(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: TaskVersionDto,
  ): Promise<TaskStateResponse> {
    return this.releases.execute(ctx, id, body);
  }
}
