import { type AuditLogDetailResponse, type AuditLogListResponse, auditLogQuerySchema } from "@cikal/contracts";
import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { Requires } from "../../../../platform/http/access.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CurrentContext } from "../../../../platform/http/current-context.js";
import { GetAuditLogUseCase } from "../application/get-audit-log.use-case.js";
import { ListAuditLogsUseCase } from "../application/list-audit-logs.use-case.js";

class AuditLogQueryDto extends createZodDto(auditLogQuerySchema) {}

/** Halaman "Audit Trail" (api-specs 17 §17.2, §17.3); tidak ada rute ubah atau hapus jejak audit (AC-14.05). */
@Controller("v1/audit-logs")
export class AuditLogsController {
  constructor(
    private readonly lists: ListAuditLogsUseCase,
    private readonly details: GetAuditLogUseCase,
  ) {}

  @Get()
  @Requires("RPT-AUDIT", "VIEW")
  list(@CurrentContext() ctx: RequestContext, @Query() query: AuditLogQueryDto): Promise<AuditLogListResponse> {
    return this.lists.execute(ctx, query);
  }

  @Get(":id")
  @Requires("RPT-AUDIT", "VIEW")
  detail(
    @CurrentContext() ctx: RequestContext,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AuditLogDetailResponse> {
    return this.details.execute(ctx, id);
  }
}
