import {
  APPROVAL_MESSAGES,
  approvalActionSchema,
  type ErrorCategory,
  type StepContext,
  type StepResult,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationFactsReader, ApplicationProcess } from "../../application/index.js";
import { OrchestratorApi, type StepHandler } from "../../orchestrator/index.js";
import { type ApplicationApprovalRow, ApplicationApprovalsRepository } from "../db/application-approvals.repository.js";
import { isAutoApproved, isRangeBoundary, routeApproval } from "../domain/approval-routing.js";
import { ApprovalSetups } from "./approval-setup.js";
import { FinancingBuilder } from "./financing-builder.js";

export const APPROVAL_QUEUE = "APPROVAL";
const AUTO_APPROVED = "AUTO_APPROVED";
const AUTO_APPROVED_SUMMARY = "Auto Approved";

/** Payload penutupan tugas APPROVAL dari keputusan approver (api-specs 16 §16.6). */
export const closedTaskSchema = z.object({ comment: z.string() });

const failure = (errorCategory: ErrorCategory, errorMessage: string): StepResult => ({
  type: "ERROR",
  errorCategory,
  errorMessage,
  retryable: false,
});

/**
 * StepHandler `APPROVAL` CORE (api-specs 16 §16.4, technical-specs 05 §5.14): auto approval RM-05, atau rantai
 * approval RM-06 yang dibentuk sekali per proses lalu tugas `APPROVAL` untuk approver posisi pertama. Setup yang
 * kurang menjadi ERROR `BUSINESS_SETUP` tanpa retry otomatis; Retry dari Process Monitoring merouting ulang (AC-27.04).
 */
@Injectable()
export class ApprovalStepHandler implements StepHandler {
  readonly stepCode = "APPROVAL";
  readonly moduleCode = "CORE";

  constructor(
    private readonly applications: ApplicationProcess,
    private readonly facts: ApplicationFactsReader,
    private readonly setups: ApprovalSetups,
    private readonly approvals: ApplicationApprovalsRepository,
    private readonly financing: FinancingBuilder,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const application = await this.applications.find(tx, ctx.applicationId);
    const facts = await this.facts.of(tx, ctx.applicationId);
    if (!application || !facts?.requestedLimit) return failure("CONFIG", "Application data is not available");
    const existing = await this.approvals.listByProcess(tx, ctx.processInstanceId);
    if (existing.length > 0) return this.replay(tx, ctx, existing, application.branchId);
    const requestedLimit = new Decimal(facts.requestedLimit);
    const limitAutoApproval = new Decimal(ctx.parameterSnapshot.PRODUCT_LIMIT_AUTO_APPROVAL ?? 0);
    if (isAutoApproved(requestedLimit, limitAutoApproval)) return this.autoApprove(tx, ctx);
    if (!application.branchId) return failure("BUSINESS_SETUP", APPROVAL_MESSAGES.noBranch);
    const boundary = ctx.parameterSnapshot.APPROVAL_RANGE_BOUNDARY;
    if (!isRangeBoundary(boundary)) return failure("CONFIG", "APPROVAL_RANGE_BOUNDARY has no valid value");
    const setup = await this.setups.of(tx, application.branchId, application.productId);
    const routing = routeApproval(setup, requestedLimit, boundary);
    if (!routing.ok) return failure("BUSINESS_SETUP", routing.message);
    const chain = routing.chain.map((node) => ({
      ...newRow(ctx, node.sequence),
      ...node,
      decision: "PENDING" as const,
    }));
    await this.approvals.insertMany(tx, ctx.tenantId, chain);
    const [entry] = chain;
    return entry ? waitFor(entry, application.branchId) : alreadyDecided();
  }

  /** Struktur kredit dibangun lebih dulu, sehingga error rumus tidak meninggalkan baris AUTO_APPROVED (FM-09). */
  private async autoApprove(tx: Tx, ctx: StepContext): Promise<StepResult> {
    try {
      await this.financing.build(tx, ctx, { approvalType: "AUTO" }, null);
    } catch (error) {
      if (error instanceof DomainError && error.code === "FORMULA_ERROR") return failure("FORMULA", error.message);
      throw error;
    }
    const row = { ...newRow(ctx, 1), decision: AUTO_APPROVED, decidedAt: new Date() } as const;
    await this.approvals.insertMany(tx, ctx.tenantId, [row]);
    return this.approved(tx, ctx, AUTO_APPROVED, AUTO_APPROVED_SUMMARY);
  }

  /** Attempt ulang memakai rantai yang tersimpan, tanpa membentuk rantai kedua (technical-specs 12 §12.1). */
  private replay(
    tx: Tx,
    ctx: StepContext,
    chain: readonly ApplicationApprovalRow[],
    branchId: string | null,
  ): Promise<StepResult> | StepResult {
    if (chain[0]?.decision === AUTO_APPROVED) return this.approved(tx, ctx, AUTO_APPROVED, AUTO_APPROVED_SUMMARY);
    const pending = chain.find((row) => row.decision === "PENDING");
    return pending && branchId ? waitFor(pending, branchId) : alreadyDecided();
  }

  /**
   * Keputusan level final yang menutup tugas (api-specs 16 §16.6 langkah 7 s.d. 9): Approve lanjut, Reject
   * mengakhiri pengajuan dengan email penolakan lewat event, Return ke Draft dengan komentar sebagai catatan.
   */
  async onHumanTaskClosed(tx: Tx, ctx: StepContext, resultCode: string, payload: unknown): Promise<StepResult> {
    const decision = approvalActionSchema.parse(resultCode);
    const { comment } = closedTaskSchema.parse(payload);
    switch (decision) {
      case "APPROVE":
        return this.approved(tx, ctx, "APPROVED", "Approved");
      case "REJECT":
        return { type: "FINISH", outcomeCode: "REJECTED", applicationStatus: "FINISHED_REJECTED", summary: comment };
      case "RETURN":
        return { type: "BACK_TO_DRAFT", outcomeCode: "RETURNED", returnNote: comment };
    }
  }

  /** Lanjut ke langkah berikutnya; tanpa langkah M15 sesudah APPROVAL proses berakhir Approved (api-specs 16 §16.6). */
  private async approved(tx: Tx, ctx: StepContext, outcomeCode: string, summary: string): Promise<StepResult> {
    const next = await this.orchestrator.nextStep(tx, ctx.processInstanceId, "APPROVAL");
    return next
      ? { type: "CONTINUE", outcomeCode, summary }
      : { type: "FINISH", outcomeCode, applicationStatus: "APPROVED", summary };
  }
}

/** Tugas `APPROVAL` untuk approver posisi rantai yang belum memutuskan (technical-specs 09 §9.4). */
function waitFor(row: ApplicationApprovalRow, branchId: string): StepResult {
  if (!row.approverUserId || row.jobLevel === null) return alreadyDecided();
  return {
    type: "WAIT_HUMAN",
    queueCode: APPROVAL_QUEUE,
    branchId,
    assigneeUserId: row.approverUserId,
    summary: APPROVAL_MESSAGES.waitingLowerLevel(row.jobLevel),
  };
}

/** Rantai proses ini sudah diputuskan; keputusan approver tidak lewat `execute` (api-specs 16 §16.6). */
function alreadyDecided(): StepResult {
  return failure("CONFIG", "The approval chain of this process is already decided");
}

function newRow(ctx: StepContext, sequence: number): ApplicationApprovalRow {
  return {
    id: uuidv7(),
    applicationId: ctx.applicationId,
    processInstanceId: ctx.processInstanceId,
    sequence,
    jobLevel: null,
    subLevel: null,
    description: null,
    approverUserId: null,
    decision: "PENDING",
    comment: null,
    decidedAt: null,
  };
}
