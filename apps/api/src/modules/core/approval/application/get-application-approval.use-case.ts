import type { ApplicationApprovalResponse } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import { ApplicationFactsReader, ApplicationProcess } from "../../application/index.js";
import { OrchestratorApi } from "../../orchestrator/index.js";
import { ApplicationApprovalsRepository } from "../db/application-approvals.repository.js";
import { LevelsRepository } from "../db/levels.repository.js";
import { applicationNotFound } from "../domain/approval-errors.js";
import { approvalView } from "../domain/approval-view.js";
import { approverRateRange } from "../domain/approver-rate.js";
import { chainOf, NO_ACTIONS } from "./approval-chain.js";

const MONEY_SCALE = 2;
const PERCENT_SCALE = 4;

const percentOf = (value: string | undefined): string => new Decimal(value ?? 0).toFixed(PERCENT_SCALE);

/**
 * Halaman "Approval Detail" (api-specs 16 §16.5). Approver dengan `OPS-APPROVAL` VIEW membuka pengajuan yang
 * rantainya memuat dirinya; `APP-INQUIRY` VIEW membaca pengajuan mana pun tanpa aksi. Pengajuan di luar keduanya
 * dijawab `APPLICATION_NOT_FOUND`.
 */
@Injectable()
export class GetApplicationApprovalUseCase {
  constructor(
    private readonly db: TenantTx,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
    private readonly applications: ApplicationProcess,
    private readonly facts: ApplicationFactsReader,
    private readonly approvals: ApplicationApprovalsRepository,
    private readonly levels: LevelsRepository,
    private readonly orchestrator: OrchestratorApi,
  ) {}

  async execute(ctx: RequestContext, applicationId: string): Promise<ApplicationApprovalResponse> {
    const [canApprove, canInquire] = await Promise.all([
      this.access.allows(ctx, "OPS-APPROVAL", "VIEW"),
      this.access.allows(ctx, "APP-INQUIRY", "VIEW"),
    ]);
    if (!canApprove && !canInquire) await this.access.authorize(ctx, "OPS-APPROVAL", "VIEW");
    return this.db.withTenantTx(ctx, async (tx) => {
      const application = await this.applications.find(tx, applicationId);
      const facts = await this.facts.of(tx, applicationId);
      if (!application || !facts) throw applicationNotFound();
      const rows = await this.approvals.listLatestByApplication(tx, applicationId);
      const chain = chainOf(rows);
      const inChain = canApprove && chain.some((row) => row.approverUserId === ctx.userId);
      if (!canInquire && !inChain) throw applicationNotFound();
      const [first] = rows;
      if (!first) throw DomainError.standard("NOT_FOUND");
      const processInstanceId = first.processInstanceId;
      const snapshot = await this.orchestrator.parameterSnapshot(tx, processInstanceId);
      const step = await this.orchestrator.stepOf(tx, applicationId, "APPROVAL", processInstanceId);
      const levels = application.branchId
        ? await this.levels.listFor(tx, application.branchId, application.productId)
        : [];
      const approvers = await this.users.describe(
        tx,
        chain.map((row) => row.approverUserId),
      );
      const actionsOf = (jobLevel: number) => levels.find((level) => level.jobLevel === jobLevel) ?? NO_ACTIONS;
      const view = approvalView({
        chain: inChain ? chain : [],
        viewerId: ctx.userId,
        submittedBy: application.submittedBy,
        waiting: step?.status === "WAITING_HUMAN",
        actionsOf,
      });
      const range = approverRateRange(snapshot ?? {});
      return {
        data: {
          applicationId,
          loanId: application.loanId,
          requestedLimit: new Decimal(facts.requestedLimit ?? 0).toFixed(MONEY_SCALE),
          tenorProposed: facts.tenorProposed ?? 0,
          interestRate: percentOf(snapshot?.PRODUCT_INTEREST_RATE),
          approverRateMin: range ? range.min.toFixed(PERCENT_SCALE) : null,
          approverRateMax: range ? range.max.toFixed(PERCENT_SCALE) : null,
          rateEditable: range !== null,
          chain: chain.map((row) => ({
            jobLevel: row.jobLevel,
            subLevel: row.subLevel,
            description: row.description ?? "",
            approver: { username: approvers.get(row.approverUserId)?.username ?? "" },
            decision: row.decision,
            comment: row.comment,
            decidedAt: row.decidedAt?.toISOString() ?? null,
          })),
          myLevel: view.myRow && {
            jobLevel: view.myRow.jobLevel,
            subLevel: view.myRow.subLevel,
            isFinalApprover: actionsOf(view.myRow.jobLevel).isFinalApprover,
          },
          allowedActions: view.allowedActions,
          blockedReason: view.blockedReason,
        },
      };
    });
  }
}
