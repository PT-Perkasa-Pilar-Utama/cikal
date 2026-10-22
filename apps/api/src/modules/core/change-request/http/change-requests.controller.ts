import {
  type ChangeRequestDetailResponse,
  type ChangeRequestListResponse,
  type ChangeRequestReviewResponse,
  changeRequestApproveResponseMock,
  changeRequestDetailResponseMock,
  changeRequestListQuerySchema,
  changeRequestListResponseMock,
  changeRequestRejectResponseMock,
  changeRequestReviewRequestSchema,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated } from "../../../../platform/http/access.js";

class ChangeRequestListQueryDto extends createZodDto(changeRequestListQuerySchema) {}
class ChangeRequestReviewDto extends createZodDto(changeRequestReviewRequestSchema) {}

/**
 * Stub sisi Checker (api-specs 07 §7.2 s.d. §7.5). Hak menu bergantung pada `entityType` (api-specs 07 §7.1),
 * jadi diperiksa di service, bukan lewat `@Requires`. Mengembalikan mock kontrak sampai BE-S1-02.
 */
@Controller("v1/change-requests")
export class ChangeRequestsController {
  @Get()
  @Authenticated()
  list(@Query() _query: ChangeRequestListQueryDto): ChangeRequestListResponse {
    return changeRequestListResponseMock;
  }

  @Get(":id")
  @Authenticated()
  detail(@Param("id", ParseUUIDPipe) _id: string): ChangeRequestDetailResponse {
    return changeRequestDetailResponseMock;
  }

  @Post(":id/approve")
  @HttpCode(200)
  @Authenticated()
  approve(@Param("id", ParseUUIDPipe) _id: string, @Body() _body: ChangeRequestReviewDto): ChangeRequestReviewResponse {
    return changeRequestApproveResponseMock;
  }

  @Post(":id/reject")
  @HttpCode(200)
  @Authenticated()
  reject(@Param("id", ParseUUIDPipe) _id: string, @Body() _body: ChangeRequestReviewDto): ChangeRequestReviewResponse {
    return changeRequestRejectResponseMock;
  }
}
