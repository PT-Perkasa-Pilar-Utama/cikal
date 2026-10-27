import type { ErrorCategory, MonitoringStatus, StepCode, StepStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { processInstances, stepExecutions } from "./schema.js";

export interface MonitoringFilter {
  statuses: readonly MonitoringStatus[];
  stepCode?: StepCode;
  /** Potongan Loan ID tanpa membedakan huruf besar dan kecil, atau pengajuan yang nama pemohonnya cocok. */
  search?: { loanId: string; applicationIds: string[] };
}

export interface MonitoringPage {
  offset: number;
  limit: number;
  sort: "stepStartedAt" | "loanId";
  direction: "asc" | "desc";
}

export interface MonitoringRow {
  processInstanceId: string;
  applicationId: string;
  loanId: string;
  stepExecutionId: string;
  stepCode: StepCode;
  status: StepStatus;
  attempt: number;
  errorCategory: ErrorCategory | null;
  errorMessage: string | null;
  startedAt: Date | null;
}

const ACTIVE = ["RUNNING", "WAITING"] as const;

/**
 * Baca Process Monitoring (api-specs 13 §13.3): proses RUNNING atau WAITING beserta attempt terakhir langkah yang
 * sedang dikerjakan. Paling banyak satu langkah per proses berstatus RUNNING, WAITING, atau ERROR.
 */
@Injectable()
export class ProcessMonitoringRepository {
  async list(tx: Tx, filter: MonitoringFilter, page: MonitoringPage): Promise<MonitoringRow[]> {
    const latest = latestSteps(tx);
    const order = page.direction === "asc" ? asc : desc;
    const column = page.sort === "loanId" ? processInstances.loanId : latest.startedAt;
    return tx
      .select({
        processInstanceId: processInstances.id,
        applicationId: processInstances.applicationId,
        loanId: processInstances.loanId,
        stepExecutionId: latest.id,
        stepCode: latest.stepCode,
        status: latest.status,
        attempt: latest.attempt,
        errorCategory: latest.errorCategory,
        errorMessage: latest.errorMessage,
        startedAt: latest.startedAt,
      })
      .from(processInstances)
      .innerJoin(latest, eq(latest.processInstanceId, processInstances.id))
      .where(matching(filter, latest))
      .orderBy(order(column), asc(processInstances.id))
      .offset(page.offset)
      .limit(page.limit);
  }

  async count(tx: Tx, filter: MonitoringFilter): Promise<number> {
    const latest = latestSteps(tx);
    const [row] = await tx
      .select({ total: count() })
      .from(processInstances)
      .innerJoin(latest, eq(latest.processInstanceId, processInstances.id))
      .where(matching(filter, latest));
    return row?.total ?? 0;
  }
}

/** Attempt terakhir setiap langkah proses aktif. */
function latestSteps(tx: Tx) {
  const active = tx
    .select({ id: processInstances.id })
    .from(processInstances)
    .where(inArray(processInstances.status, ACTIVE));
  return tx
    .selectDistinctOn([stepExecutions.processInstanceId, stepExecutions.stepCode], {
      id: stepExecutions.id,
      processInstanceId: stepExecutions.processInstanceId,
      stepCode: stepExecutions.stepCode,
      status: stepExecutions.status,
      attempt: stepExecutions.attempt,
      errorCategory: stepExecutions.errorCategory,
      errorMessage: stepExecutions.errorMessage,
      startedAt: stepExecutions.startedAt,
    })
    .from(stepExecutions)
    .where(inArray(stepExecutions.processInstanceId, active))
    .orderBy(asc(stepExecutions.processInstanceId), asc(stepExecutions.stepCode), desc(stepExecutions.attempt))
    .as("latest");
}

function matching(filter: MonitoringFilter, latest: ReturnType<typeof latestSteps>): SQL | undefined {
  return and(
    inArray(processInstances.status, ACTIVE),
    inArray(latest.status, filter.statuses),
    filter.stepCode ? eq(latest.stepCode, filter.stepCode) : undefined,
    filter.search ? searching(filter.search) : undefined,
  );
}

/** Daftar id pengajuan dikirim sebagai satu parameter array agar jumlah nama yang cocok tidak dibatasi parameter. */
function searching(search: NonNullable<MonitoringFilter["search"]>): SQL | undefined {
  return or(
    ilike(processInstances.loanId, `%${escapeLike(search.loanId)}%`),
    search.applicationIds.length > 0
      ? sql`${processInstances.applicationId} = any(${sql.param(search.applicationIds)}::uuid[])`
      : undefined,
  );
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
