import {
  type ChangeRequestAccepted,
  type ScoringModelDetailResponse,
  type ScoringModelListResponse,
  type ScoringModelTestResponse,
  scoringModelCreateSchema,
  scoringModelListQuerySchema,
  scoringModelSubmitSchema,
  scoringModelTestRequestSchema,
  scoringModelUpdateSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetScoringModelUseCase } from "../application/get-scoring-model.use-case.js";
import { ListScoringModelsUseCase } from "../application/list-scoring-models.use-case.js";
import { SaveScoringModelUseCase } from "../application/save-scoring-model.use-case.js";
import { SubmitScoringModelUseCase } from "../application/submit-scoring-model.use-case.js";
import { TestScoringModelUseCase } from "../application/test-scoring-model.use-case.js";

class ScoringModelListQueryDto extends createZodDto(scoringModelListQuerySchema) {}
class ScoringModelCreateDto extends createZodDto(scoringModelCreateSchema) {}
class ScoringModelUpdateDto extends createZodDto(scoringModelUpdateSchema) {}
class ScoringModelSubmitDto extends createZodDto(scoringModelSubmitSchema) {}
class ScoringModelTestDto extends createZodDto(scoringModelTestRequestSchema) {}

/** Halaman "Scoring Model": daftar, detail, draft, pengajuan versi, dan uji model (api-specs 22 §22.1 s.d. §22.5). */
@Controller("v1/scoring-models")
export class ScoringModelsController {
  constructor(
    private readonly lists: ListScoringModelsUseCase,
    private readonly details: GetScoringModelUseCase,
    private readonly saves: SaveScoringModelUseCase,
    private readonly submits: SubmitScoringModelUseCase,
    private readonly tests: TestScoringModelUseCase,
  ) {}

  @Get()
  @Requires("MST-SCORING", "VIEW")
  list(
    @CurrentContext() ctx: RequestContext,
    @Query() query: ScoringModelListQueryDto,
  ): Promise<ScoringModelListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Get(":id")
  @Requires("MST-SCORING", "VIEW")
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ScoringModelDetailResponse> {
    return this.details.execute(ctx, id);
  }

  @Post()
  @Requires("MST-SCORING", "CREATE")
  create(
    @CurrentContext() ctx: RequestContext,
    @Body() body: ScoringModelCreateDto,
  ): Promise<ScoringModelDetailResponse> {
    return this.saves.create(ctx, body);
  }

  @Post(":id/new-version")
  @Requires("MST-SCORING", "UPDATE")
  newVersion(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ScoringModelDetailResponse> {
    return this.saves.newVersion(ctx, id);
  }

  @Put(":id")
  @Requires("MST-SCORING", "UPDATE")
  update(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ScoringModelUpdateDto,
  ): Promise<ScoringModelDetailResponse> {
    return this.saves.update(ctx, id, body);
  }

  @Post(":id/submit")
  @HttpCode(202)
  @Requires("MST-SCORING", "UPDATE")
  submit(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ScoringModelSubmitDto,
  ): Promise<ChangeRequestAccepted> {
    return this.submits.execute(ctx, id, body);
  }

  @Post(":id/test")
  @HttpCode(200)
  @Requires("MST-SCORING", "VIEW")
  test(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ScoringModelTestDto,
  ): Promise<ScoringModelTestResponse> {
    return this.tests.execute(ctx, id, body);
  }
}
