import {
  monitoringStatusSchema,
  type ProcessMonitoringItem,
  type ProcessMonitoringQuery,
  type ProcessMonitoringResponse,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import {
  type MonitoringFilter,
  type MonitoringPage,
  type MonitoringRow,
  ProcessMonitoringRepository,
} from "../db/process-monitoring.repository.js";

const SORTS = {
  "stepStartedAt,asc": ["stepStartedAt", "asc"],
  "stepStartedAt,desc": ["stepStartedAt", "desc"],
  "loanId,asc": ["loanId", "asc"],
  "loanId,desc": ["loanId", "desc"],
} as const satisfies Record<
  ProcessMonitoringQuery["sort"],
  readonly [MonitoringPage["sort"], MonitoringPage["direction"]]
>;

/** Halaman "Process Monitoring" (api-specs 13 §13.3); filter `ERROR` hanya langkah saat ini yang error (AC-86.04). */
@Injectable()
export class ListProcessMonitoringUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly monitoring: ProcessMonitoringRepository,
  ) {}

  execute(ctx: TenantContext, query: ProcessMonitoringQuery): Promise<ProcessMonitoringResponse> {
    const filter: MonitoringFilter = {
      statuses: query.status ? [query.status] : monitoringStatusSchema.options,
      ...(query.stepCode ? { stepCode: query.stepCode } : {}),
      ...(query.q ? { loanId: query.q } : {}),
    };
    const [sort, direction] = SORTS[query.sort];
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };
    return this.db.withTenantTx(ctx, async (tx) => {
      const rows = await this.monitoring.list(tx, filter, page);
      const totalItems = await this.monitoring.count(tx, filter);
      return {
        data: rows.map(monitoringItem),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / query.pageSize),
        },
      };
    });
  }
}

function monitoringItem(row: MonitoringRow): ProcessMonitoringItem {
  return {
    applicationId: row.applicationId,
    loanId: row.loanId,
    fullName: null,
    branchCode: null,
    processInstanceId: row.processInstanceId,
    currentStep: {
      stepExecutionId: row.stepExecutionId,
      stepCode: row.stepCode,
      status: monitoringStatusSchema.parse(row.status),
      attempt: row.attempt,
      errorCategory: row.errorCategory,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt?.toISOString() ?? null,
    },
  };
}
