import {
  type ApplicationStatus,
  type StepCode,
  type StepContext,
  type StepResult,
  stepModules,
} from "@cikal/contracts";
import type { INestApplicationContext } from "@nestjs/common";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { AdvanceProcess } from "../../src/modules/core/orchestrator/application/advance-process.js";
import { WaitingSteps } from "../../src/modules/core/orchestrator/application/waiting-steps.js";
import { OrchestratorApi, type StepHandler, StepHandlerRegistry } from "../../src/modules/core/orchestrator/index.js";
import { ADVANCE_QUEUE, WAIT_DEADLINE_QUEUE } from "../../src/modules/core/orchestrator/jobs/queues.js";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { TenantTx } from "../../src/platform/db/tenant-tx.js";

export const CONTINUE: StepResult = { type: "CONTINUE", outcomeCode: "PASSED", summary: "Passed" };
/** Langkah terakhir rute uji: tanpa M15 proses berakhir di Approved (DEP-07). */
export const APPROVED: StepResult = {
  type: "FINISH",
  outcomeCode: "APPROVED",
  applicationStatus: "APPROVED",
  summary: "Approved",
};

/**
 * StepHandler uji untuk modul langkah yang belum dibangun: hasil diatur per pengajuan, lalu hasil bawaan. Konteks
 * setiap panggilan disimpan agar uji bisa memeriksa snapshot dan kunci idempotensi.
 */
export class ScriptedStepHandler implements StepHandler {
  readonly moduleCode: string;
  readonly contexts: StepContext[] = [];
  private readonly results = new Map<string, StepResult[]>();
  private readonly notApplicable = new Set<string>();

  constructor(
    readonly stepCode: StepCode,
    private readonly fallback: StepResult,
  ) {
    this.moduleCode = stepModules[stepCode];
  }

  /** Hasil berurutan untuk `execute`, `onHumanTaskClosed`, dan `onExternalResult` pengajuan ini. */
  script(applicationId: string, ...results: StepResult[]): this {
    this.results.set(applicationId, results);
    return this;
  }

  /** Syarat langkah tidak terpenuhi untuk pengajuan ini (RT-08). */
  skipFor(applicationId: string): this {
    this.notApplicable.add(applicationId);
    return this;
  }

  async isApplicable(_tx: unknown, ctx: StepContext): Promise<boolean> {
    return !this.notApplicable.has(ctx.applicationId);
  }

  async execute(_tx: unknown, ctx: StepContext): Promise<StepResult> {
    this.contexts.push(ctx);
    return this.next(ctx);
  }

  async onHumanTaskClosed(_tx: unknown, ctx: StepContext): Promise<StepResult> {
    return this.next(ctx);
  }

  async onExternalResult(_tx: unknown, ctx: StepContext): Promise<StepResult> {
    return this.next(ctx);
  }

  private next(ctx: StepContext): StepResult {
    return this.results.get(ctx.applicationId)?.shift() ?? this.fallback;
  }
}

/** Satu handler uji per langkah; APPROVAL berakhir Approved dan langkah lain CONTINUE bila tidak diatur. */
export function registerStepHandlers(
  app: INestApplicationContext,
  codes: StepCode[],
): Map<StepCode, ScriptedStepHandler> {
  const registry = app.get(StepHandlerRegistry);
  return new Map(
    codes.map((code) => {
      const handler = new ScriptedStepHandler(code, code === "APPROVAL" ? APPROVED : CONTINUE);
      registry.register(handler);
      return [code, handler];
    }),
  );
}

/** Rute produk dengan satu versi per entri, ditulis lewat role pemilik skema seperti sudah disetujui Checker. */
export async function insertRoute(
  owner: pg.Pool,
  productId: string,
  versions: {
    versionNumber: number;
    status: "ACTIVE" | "SUPERSEDED" | "WAITING_APPROVAL";
    steps: Partial<Record<StepCode, boolean>>;
  }[],
  tenantId: string = seedCompanyIds.company001,
): Promise<string[]> {
  const routeId = uuidv7();
  await owner.query("insert into product.product_routes (id, tenant_id, product_id) values ($1, $2, $3)", [
    routeId,
    tenantId,
    productId,
  ]);
  const ids: string[] = [];
  for (const version of versions) {
    const versionId = uuidv7();
    ids.push(versionId);
    await owner.query(
      `insert into product.product_route_versions (id, tenant_id, route_id, version_number, status, effective_from)
       values ($1, $2, $3, $4, $5, now())`,
      [versionId, tenantId, routeId, version.versionNumber, version.status],
    );
    for (const [stepCode, isEnabled] of Object.entries(version.steps)) {
      await owner.query(
        `insert into product.product_route_steps (id, tenant_id, version_id, step_code, is_enabled)
         values ($1, $2, $3, $4, $5)`,
        [uuidv7(), tenantId, versionId, stepCode, isEnabled],
      );
    }
  }
  return ids;
}

/** Persetujuan versi rute baru seperti hasil ChangeRequest ROUTE (AC-31.03). */
export async function activateRouteVersion(owner: pg.Pool, activeId: string, nextId: string): Promise<void> {
  await owner.query("update product.product_route_versions set status = 'SUPERSEDED' where id = $1", [activeId]);
  await owner.query("update product.product_route_versions set status = 'ACTIVE' where id = $1", [nextId]);
}

let loanCounter = 0;

/** Pengajuan yang sudah disubmit (`ON_PROGRESS`) atau masih draft, ditulis langsung karena API draft ada di Sprint 3. */
export async function insertApplication(
  owner: pg.Pool,
  options: { productId: string; submittedBy: string | null; status?: ApplicationStatus; tenantId?: string },
): Promise<string> {
  loanCounter += 1;
  const id = uuidv7();
  const status = options.status ?? "ON_PROGRESS";
  const submitted = status !== "DRAFT";
  await owner.query(
    `insert into application.applications (id, tenant_id, loan_id, channel, product_category, product_id, status,
       submitted_by, submitted_at, created_at, created_by)
     values ($1, $2, $3, 'WEB', 'NON_COLLATERAL', $4, $5, $6, $7, now() - interval '2 days', $8)`,
    [
      id,
      options.tenantId ?? seedCompanyIds.company001,
      `20102026KTA${String(loanCounter).padStart(7, "0")}`,
      options.productId,
      status,
      submitted ? options.submittedBy : null,
      submitted ? new Date() : null,
      options.submittedBy,
    ],
  );
  return id;
}

/** `orchestrator.start` di transaksi tenant company 001, seperti dari submit (api-specs 12 §12.8). */
export async function startProcess(
  app: INestApplicationContext,
  applicationId: string,
  tenantId: string = seedCompanyIds.company001,
): Promise<string> {
  const actor = { tenantId, userId: uuidv7() };
  const { processInstanceId } = await app
    .get(TenantTx)
    .withTenantTx(actor, (tx) => app.get(OrchestratorApi).start(tx, applicationId));
  return processInstanceId;
}

/**
 * Menjalankan job orchestrator yang sudah jatuh tempo satu per satu, seperti worker, sampai antrean kosong.
 * `includeDelayed` juga mengambil job yang dijadwalkan nanti, contoh jeda retry dan batas tunggu.
 */
export async function drainProcessJobs(
  app: INestApplicationContext,
  owner: pg.Pool,
  options: { includeDelayed?: boolean } = {},
): Promise<number> {
  let processed = 0;
  for (;;) {
    const { rows } = await owner.query<{ name: string; data: Record<string, string> }>(
      `update pgboss.job set state = 'completed', completed_on = now()
        where id = (select id from pgboss.job where name = any($1) and state = 'created' and ($2 or start_after <= now())
                     order by created_on, id limit 1)
        returning name, data`,
      [[ADVANCE_QUEUE, WAIT_DEADLINE_QUEUE], options.includeDelayed ?? false],
    );
    const job = rows[0];
    if (!job) return processed;
    const { tenantId = "", processInstanceId = "", stepExecutionId = "" } = job.data;
    if (job.name === ADVANCE_QUEUE) await app.get(AdvanceProcess).execute(tenantId, processInstanceId);
    else await app.get(WaitingSteps).expireWait(tenantId, stepExecutionId);
    processed += 1;
  }
}

export interface StepExecutionRow {
  id: string;
  step_code: StepCode;
  status: string;
  attempt: number;
  skip_reason: string | null;
  outcome_code: string | null;
  error_category: string | null;
  error_message: string | null;
  actor_user_id: string | null;
}

/** Attempt terakhir setiap langkah satu proses, dibaca role pemilik skema. */
export async function latestSteps(owner: pg.Pool, processInstanceId: string): Promise<Map<StepCode, StepExecutionRow>> {
  const { rows } = await owner.query<StepExecutionRow>(
    `select distinct on (step_code) id, step_code, status, attempt, skip_reason, outcome_code, error_category,
            error_message, actor_user_id
       from orchestrator.step_executions where process_instance_id = $1 order by step_code, attempt desc`,
    [processInstanceId],
  );
  return new Map(rows.map((row) => [row.step_code, row]));
}

export async function processStatus(owner: pg.Pool, processInstanceId: string): Promise<string | undefined> {
  const { rows } = await owner.query<{ status: string }>(
    "select status from orchestrator.process_instances where id = $1",
    [processInstanceId],
  );
  return rows[0]?.status;
}

export async function applicationState(
  owner: pg.Pool,
  applicationId: string,
): Promise<{ status: string; current_step: string | null; return_note: string | null } | undefined> {
  const { rows } = await owner.query<{ status: string; current_step: string | null; return_note: string | null }>(
    "select status, current_step, return_note from application.applications where id = $1",
    [applicationId],
  );
  return rows[0];
}
