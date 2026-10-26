import {
  type ApplicationApprovalResponse,
  type ApprovalDecisionResponse,
  approvalDecisionRequestSchema,
  type FinancingResponse,
} from "@cikal/contracts";
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Authenticated, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { IdempotencyRequired } from "../../../../platform/http/idempotency.interceptor.js";
import { DecideApprovalUseCase } from "../application/decide-approval.use-case.js";
import { GetApplicationApprovalUseCase } from "../application/get-application-approval.use-case.js";
import { GetApplicationFinancingUseCase } from "../application/get-application-financing.use-case.js";

class ApprovalDecisionDto extends createZodDto(approvalDecisionRequestSchema) {}

/** Detail approval, keputusan approver, dan struktur kredit satu pengajuan (api-specs 16 §16.5 s.d. §16.7). */
@Controller("v1/applications")
export class ApplicationApprovalController {
  constructor(
    private readonly approvals: GetApplicationApprovalUseCase,
    private readonly financings: GetApplicationFinancingUseCase,
    private readonly decisions: DecideApprovalUseCase,
  ) {}

  /** `OPS-APPROVAL` VIEW atau `APP-INQUIRY` VIEW; aturan keduanya diperiksa use case. */
  @Get(":id/approval")
  @Authenticated()
  approval(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ApplicationApprovalResponse> {
    return this.approvals.execute(ctx, id);
  }

  @Post(":id/approval/decision")
  @HttpCode(200)
  @Requires("OPS-APPROVAL", "APPROVE")
  @IdempotencyRequired()
  decide(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ApprovalDecisionDto,
  ): Promise<ApprovalDecisionResponse> {
    return this.decisions.execute(ctx, id, body);
  }

  @Get(":id/financing")
  @Requires("APP-INQUIRY", "VIEW")
  financing(@CurrentContext() ctx: RequestContext, @Param("id", ParseUUIDPipe) id: string): Promise<FinancingResponse> {
    return this.financings.execute(ctx, id);
  }
}
