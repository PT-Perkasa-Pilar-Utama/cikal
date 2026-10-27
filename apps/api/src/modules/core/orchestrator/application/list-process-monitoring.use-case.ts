import {
  monitoringStatusSchema,
  type ProcessMonitoringItem,
  type ProcessMonitoringQuery,
  type ProcessMonitoringResponse,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ApplicantNames } from "../../application/index.js";
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

/**
 * Halaman "Process Monitoring" (api-specs 13 §13.3); filter `ERROR` hanya langkah saat ini yang error (AC-86.04).
 * Nama pemohon dibaca lewat antarmuka modul Application (XM-02).
 */
@Injectable()
export class ListProcessMonitoringUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly monitoring: ProcessMonitoringRepository,
    private readonly names: ApplicantNames,
  ) {}

  execute(ctx: TenantContext, query: ProcessMonitoringQuery): Promise<ProcessMonitoringResponse> {
    const [sort, direction] = SORTS[query.sort];
    const page = { offset: (query.page - 1) * query.pageSize, limit: query.pageSize, sort, direction };
    return this.db.withTenantTx(ctx, async (tx) => {
      const filter: MonitoringFilter = {
        statuses: query.status ? [query.status] : monitoringStatusSchema.options,
        ...(query.stepCode ? { stepCode: query.stepCode } : {}),
        ...(query.q ? { search: { loanId: query.q, applicationIds: await this.names.matching(tx, query.q) } } : {}),
      };
      const rows = await this.monitoring.list(tx, filter, page);
      const totalItems = await this.monitoring.count(tx, filter);
      const fullNames = await this.names.namesOf(
        tx,
        rows.map((row) => row.applicationId),
      );
      return {
        data: rows.map((row) => monitoringItem(row, fullNames.get(row.applicationId) ?? null)),
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

function monitoringItem(row: MonitoringRow, fullName: string | null): ProcessMonitoringItem {
  return {
    applicationId: row.applicationId,
    loanId: row.loanId,
    fullName,
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
