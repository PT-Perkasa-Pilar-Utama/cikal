import type { ApplicationApprovalResponse, FinancingResponse } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { Authenticated, Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetApplicationApprovalUseCase } from "../application/get-application-approval.use-case.js";
import { GetApplicationFinancingUseCase } from "../application/get-application-financing.use-case.js";

/** Detail approval dan struktur kredit satu pengajuan (api-specs 16 §16.5, §16.7). */
@Controller("v1/applications")
export class ApplicationApprovalController {
  constructor(
    private readonly approvals: GetApplicationApprovalUseCase,
    private readonly financings: GetApplicationFinancingUseCase,
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

  @Get(":id/financing")
  @Requires("APP-INQUIRY", "VIEW")
  financing(@CurrentContext() ctx: RequestContext, @Param("id", ParseUUIDPipe) id: string): Promise<FinancingResponse> {
    return this.financings.execute(ctx, id);
  }
}
