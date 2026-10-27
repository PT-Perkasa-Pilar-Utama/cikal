import { type ApplicationInquiryResponse, applicationInquiryQuerySchema } from "@cikal/contracts";
import { Controller, Get, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { ListApplicationsUseCase } from "../application/list-applications.use-case.js";

class InquiryQueryDto extends createZodDto(applicationInquiryQuerySchema) {}

/** Halaman "Application Inquiry" (api-specs 17 §17.1). */
@Controller("v1/applications")
export class ApplicationsInquiryController {
  constructor(private readonly lists: ListApplicationsUseCase) {}

  @Get()
  @Requires("APP-INQUIRY", "VIEW")
  list(@CurrentContext() ctx: RequestContext, @Query() query: InquiryQueryDto): Promise<ApplicationInquiryResponse> {
    return this.lists.execute(ctx, query);
  }
}
