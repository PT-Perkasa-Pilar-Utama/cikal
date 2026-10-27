import type { StepResult } from "@cikal/contracts";
import type { INestApplicationContext } from "@nestjs/common";
import type pg from "pg";
import { seedRoleIds } from "../../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../../src/modules/core/organization/index.js";
import { drainProcessJobs, insertApplication, insertRoute, type ScriptedStepHandler, startProcess } from "./process.js";
import { insertProduct } from "./product.js";

/** Cabang seed 011 Bandung, di regional Jawa Barat. */
export const TASK_BRANCH_ID = seedOrganizationIds.bandung;

export interface TestTask {
  id: string;
  applicationId: string;
  loanId: string;
  stepExecutionId: string;
  processInstanceId: string;
  version: number;
}

/** Langkah VERIFICATION menunggu tugas antrean VERIFICATION untuk Verifikator cabang uji (api-specs 14 §14.1). */
const WAIT_FOR_VERIFIKATOR: StepResult = {
  type: "WAIT_HUMAN",
  queueCode: "VERIFICATION",
  branchId: TASK_BRANCH_ID,
  eligibleRoleId: seedRoleIds.verifikator,
  summary: "Waiting for document verification",
};

/**
 * Tugas yang dibuat orchestrator dari hasil langkah VERIFICATION pengajuan baru, seperti modul Verification nanti.
 * Bawaannya tugas VERIFICATION; hasil ERROR tanpa retry menghasilkan tugas PROCESS_ERROR.
 */
export async function verificationTask(
  app: INestApplicationContext,
  owner: pg.Pool,
  verification: ScriptedStepHandler,
  result: StepResult = WAIT_FOR_VERIFIKATOR,
): Promise<TestTask> {
  const productId = await insertProduct(owner);
  await insertRoute(owner, productId, [
    { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, VERIFICATION: true, APPROVAL: true } },
  ]);
  const applicationId = await insertApplication(owner, { productId, submittedBy: null });
  verification.script(applicationId, result);
  const processInstanceId = await startProcess(app, applicationId);
  await drainProcessJobs(app, owner);
  const { rows } = await owner.query<Omit<TestTask, "processInstanceId">>(
    `select id, application_id as "applicationId", loan_id as "loanId", step_execution_id as "stepExecutionId", version
       from taskqueue.human_tasks where application_id = $1`,
    [applicationId],
  );
  const task = rows[0];
  if (!task) throw new Error(`No task for application ${applicationId}`);
  return { ...task, processInstanceId };
}

/** Section Personal pengajuan uji dengan nama pemohon saja; NIK berupa byte palsu karena antrean tidak membacanya. */
export async function setApplicantName(owner: pg.Pool, applicationId: string, fullName: string): Promise<void> {
  await owner.query(
    `insert into application.application_personals (application_id, tenant_id, full_name, full_name_id, id_type,
       id_card_number_enc, id_card_number_key_version, id_card_number_bidx)
     select id, tenant_id, $2, upper($2), 'KTP', '\\x00', 1, '\\x00' from application.applications where id = $1`,
    [applicationId, fullName],
  );
}

/** Unit kerja dan username user uji, ditulis langsung karena API User ada di sprint lain. */
export async function setUser(
  owner: pg.Pool,
  userId: string,
  values: { username?: string; branchId?: string | null; regionalId?: string | null },
): Promise<void> {
  if (values.username) await owner.query("update iam.users set username = $1 where id = $2", [values.username, userId]);
  if (values.branchId !== undefined) {
    await owner.query("update iam.users set branch_id = $1 where id = $2", [values.branchId, userId]);
  }
  if (values.regionalId !== undefined) {
    await owner.query("update iam.users set regional_id = $1 where id = $2", [values.regionalId, userId]);
  }
}

export async function taskRow(
  owner: pg.Pool,
  id: string,
): Promise<{ status: string; assigned_user_id: string | null; version: number; result_code: string | null }> {
  const { rows } = await owner.query<{
    status: string;
    assigned_user_id: string | null;
    version: number;
    result_code: string | null;
  }>("select status, assigned_user_id, version, result_code from taskqueue.human_tasks where id = $1", [id]);
  const row = rows[0];
  if (!row) throw new Error(`Task ${id} not found`);
  return row;
}
