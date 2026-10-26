import {
  APPROVAL_DECISION_MESSAGES,
  type ApprovalAction,
  type ApprovalDecisionRequest,
  type ApprovalDecisionResponse,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationFactsReader, ApplicationProcess } from "../../application/index.js";
import { type AuditAction, AuditTrail } from "../../audit/index.js";
import { OrchestratorApi } from "../../orchestrator/index.js";
import { TaskQueue } from "../../task-queue/index.js";
import { ApplicationApprovalsRepository } from "../db/application-approvals.repository.js";
import { LevelsRepository } from "../db/levels.repository.js";
import { decisionRow } from "../domain/approval-decision.js";
import { applicationNotFound } from "../domain/approval-errors.js";
import { approvedTerms } from "../domain/approved-terms.js";
import { type ChainEntry, chainOf, NO_ACTIONS } from "./approval-chain.js";
import { APPROVAL_QUEUE } from "./approval-step-handler.js";
import { FinancingBuilder } from "./financing-builder.js";

const AUDIT_MODULE = "Approval";
const MESSAGES = {
  APPROVE: APPROVAL_DECISION_MESSAGES.approved,
  REJECT: APPROVAL_DECISION_MESSAGES.rejected,
  RETURN: APPROVAL_DECISION_MESSAGES.returned,
} as const satisfies Record<ApprovalAction, string>;
/** `RETURN` tidak ada di daftar aksi audit; pengembalian untuk diperbaiki dicatat `REVISE`. */
const AUDIT_ACTIONS = { APPROVE: "APPROVE", REJECT: "REJECT", RETURN: "REVISE" } as const satisfies Record<
  ApprovalAction,
  AuditAction
>;

/**
 * Keputusan approver (api-specs 16 §16.6). Rantai proses dikunci lebih dulu sehingga keputusan bersamaan diproses
 * sekali (AC-72.07). Approve di level bukan final menyerahkan tugas ke approver berikutnya tanpa menyelesaikan
 * langkah (AC-72.02); keputusan lain menutup tugas lewat Task Queue sehingga StepHandler menentukan hasil langkah.
 */
@Injectable()
export class DecideApprovalUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationProcess,
    private readonly facts: ApplicationFactsReader,
    private readonly approvals: ApplicationApprovalsRepository,
    private readonly levels: LevelsRepository,
    private readonly orchestrator: OrchestratorApi,
    private readonly financing: FinancingBuilder,
    private readonly tasks: TaskQueue,
    private readonly audit: AuditTrail,
  ) {}

  execute(
    ctx: RequestContext,
    applicationId: string,
    body: ApprovalDecisionRequest,
  ): Promise<ApprovalDecisionResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.find(tx, applicationId);
      if (!application) throw applicationNotFound();
      const processInstanceId = await this.approvals.latestProcessOf(tx, applicationId);
      const chain = processInstanceId ? chainOf(await this.approvals.lockByProcess(tx, processInstanceId)) : [];
      const step = processInstanceId
        ? await this.orchestrator.stepOf(tx, applicationId, "APPROVAL", processInstanceId)
        : null;
      const levels = application.branchId
        ? await this.levels.listFor(tx, application.branchId, application.productId)
        : [];
      const mine = decisionRow({
        chain,
        viewerId: ctx.userId,
        submittedBy: application.submittedBy,
        waiting: step?.status === "WAITING_HUMAN",
        actionsOf: (jobLevel) => levels.find((level) => level.jobLevel === jobLevel) ?? NO_ACTIONS,
        decision: body.decision,
        comment: body.comment,
      });
      const comment = body.comment.trim();
      const next = chain.find((row) => row.sequence > mine.sequence && row.decision === "PENDING");
      const rateChange = body.decision === "APPROVE" && !next ? await this.approveFinal(tx, ctx, mine, body) : null;
      await this.approvals.decide(tx, mine.id, { decision: body.decision, comment, decidedAt: new Date() }, ctx.userId);
      await this.audit.record(tx, ctx, {
        module: AUDIT_MODULE,
        action: AUDIT_ACTIONS[body.decision],
        recordId: applicationId,
        description: `Level ${mine.jobLevel} ${body.decision} ${application.loanId}: ${comment}`,
        ...(rateChange ?? {}),
      });
      const scope = { applicationId, queueCode: APPROVAL_QUEUE } as const;
      const closing = {
        userId: ctx.userId,
        resultCode: body.decision,
        payload: { comment },
        alreadyProcessedMessage: APPROVAL_DECISION_MESSAGES.alreadyProcessed,
      };
      const handOver = body.decision === "APPROVE" && next;
      if (handOver) await this.tasks.handOver(tx, scope, closing, next.approverUserId);
      else await this.tasks.closeFor(tx, scope, closing);
      const nextStep = handOver
        ? "APPROVAL"
        : body.decision === "APPROVE"
          ? await this.orchestrator.nextStep(tx, mine.processInstanceId, "APPROVAL")
          : null;
      const after = await this.applications.find(tx, applicationId);
      return {
        data: {
          decision: body.decision,
          jobLevel: mine.jobLevel,
          isFinal: !next,
          applicationStatus: after?.status ?? application.status,
          nextStep,
        },
        message: MESSAGES[body.decision],
      };
    });
  }

  /**
   * Struktur kredit level final dengan perubahan approver (RM-07, RM-08); perubahan suku bunga dicatat dengan nilai
   * lama dan baru (AC-97.06). Perubahan struktur kredit di level lain diabaikan.
   */
  private async approveFinal(
    tx: Tx,
    ctx: RequestContext,
    mine: ChainEntry,
    body: ApprovalDecisionRequest,
  ): Promise<{ oldData: unknown; newData: unknown } | null> {
    const parameterSnapshot = (await this.orchestrator.parameterSnapshot(tx, mine.processInstanceId)) ?? {};
    const facts = await this.facts.of(tx, mine.applicationId);
    const values = approvedTerms(body, parameterSnapshot, new Decimal(facts?.requestedLimit ?? 0));
    const process = {
      tenantId: ctx.tenantId,
      applicationId: mine.applicationId,
      processInstanceId: mine.processInstanceId,
      parameterSnapshot,
    };
    await this.financing.build(tx, process, { approvalType: "MANUAL", ...values }, ctx.userId);
    const productRate = parameterSnapshot.PRODUCT_INTEREST_RATE;
    if (!values.interestRate || !productRate || values.interestRate.equals(productRate)) return null;
    return { oldData: { interestRate: productRate }, newData: { interestRate: body.interestRate } };
  }
}
