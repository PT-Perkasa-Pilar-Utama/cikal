import type { StepResult } from "@cikal/contracts";
import type { INestApplicationContext } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import {
  drainProcessJobs,
  insertApplication,
  insertRoute,
  latestSteps,
  type ScriptedStepHandler,
  startProcess,
} from "./process.js";
import { insertProduct } from "./product.js";
import type { TestSession } from "./session.js";

export const DUKCAPIL_TIMEOUT: StepResult = {
  type: "ERROR",
  errorCategory: "TIMEOUT",
  errorMessage: "Dukcapil service timeout",
  retryable: true,
};

const ROUTE = { DATA_ENTRY: true, DUKCAPIL: true, APPROVAL: true };

export interface MonitoredProcess {
  applicationId: string;
  processId: string;
  loanId: string;
  dukcapilId: string;
}

/**
 * Pengajuan yang langkah DUKCAPIL-nya menghasilkan `results` berurutan, setelah semua job (termasuk jeda retry
 * otomatis) dijalankan. Empat ERROR sementara berhenti di attempt 4 dengan tugas PROCESS_ERROR.
 */
export async function atDukcapil(
  app: INestApplicationContext,
  owner: pg.Pool,
  dukcapil: ScriptedStepHandler,
  ...results: StepResult[]
): Promise<MonitoredProcess> {
  const productId = await insertProduct(owner);
  await insertRoute(owner, productId, [{ versionNumber: 1, status: "ACTIVE", steps: ROUTE }]);
  const applicationId = await insertApplication(owner, { productId, submittedBy: null });
  dukcapil.script(applicationId, ...results);
  const processId = await startProcess(app, applicationId);
  await drainProcessJobs(app, owner, { includeDelayed: true });
  const { rows } = await owner.query<{ loan_id: string }>(
    "select loan_id from application.applications where id = $1",
    [applicationId],
  );
  const dukcapilId = (await latestSteps(owner, processId)).get("DUKCAPIL")?.id ?? "";
  return { applicationId, processId, loanId: rows[0]?.loan_id ?? "", dukcapilId };
}

/** Request Process Monitoring dengan `Idempotency-Key` baru untuk POST (api-specs 13 §13.4, §13.5). */
export function monitoringRequest(app: NestFastifyApplication, session: TestSession) {
  return {
    get: (url: string) => app.inject({ method: "GET", url: `/api/v1${url}`, headers: session.headers }),
    post: (url: string, payload?: object) =>
      app.inject({
        method: "POST",
        url: `/api/v1${url}`,
        headers: { ...session.headers, "idempotency-key": uuidv7() },
        ...(payload ? { payload } : {}),
      }),
  };
}

export async function openTasks(owner: pg.Pool, applicationId: string): Promise<{ queue_code: string }[]> {
  const { rows } = await owner.query<{ queue_code: string }>(
    "select queue_code from taskqueue.human_tasks where application_id = $1 and status <> 'CLOSED'",
    [applicationId],
  );
  return rows;
}

export async function auditActions(owner: pg.Pool, recordId: string): Promise<{ action: string; module: string }[]> {
  const { rows } = await owner.query<{ action: string; module: string }>(
    "select action, module from audit.audit_logs where record_id = $1 order by occurred_at",
    [recordId],
  );
  return rows;
}
