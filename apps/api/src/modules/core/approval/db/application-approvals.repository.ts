import type { ApprovalDecision } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { asc, desc, eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applicationApprovals } from "./schema.js";

export interface ApplicationApprovalRow {
  id: string;
  applicationId: string;
  processInstanceId: string;
  sequence: number;
  jobLevel: number | null;
  subLevel: number | null;
  description: string | null;
  approverUserId: string | null;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: Date | null;
}

const columns = {
  id: applicationApprovals.id,
  applicationId: applicationApprovals.applicationId,
  processInstanceId: applicationApprovals.processInstanceId,
  sequence: applicationApprovals.sequence,
  jobLevel: applicationApprovals.jobLevel,
  subLevel: applicationApprovals.subLevel,
  description: applicationApprovals.description,
  approverUserId: applicationApprovals.approverUserId,
  decision: applicationApprovals.decision,
  comment: applicationApprovals.comment,
  decidedAt: applicationApprovals.decidedAt,
};

/** Akses tabel `approval.application_approvals` (technical-specs 06 §6.10). */
@Injectable()
export class ApplicationApprovalsRepository {
  async insertMany(tx: Tx, tenantId: string, rows: ApplicationApprovalRow[]): Promise<void> {
    await tx.insert(applicationApprovals).values(rows.map((row) => ({ ...row, tenantId })));
  }

  /** Rantai satu ProcessInstance menurut urutan. */
  async listByProcess(tx: Tx, processInstanceId: string): Promise<ApplicationApprovalRow[]> {
    return tx
      .select(columns)
      .from(applicationApprovals)
      .where(eq(applicationApprovals.processInstanceId, processInstanceId))
      .orderBy(asc(applicationApprovals.sequence));
  }

  /** Rantai satu ProcessInstance dikunci sampai transaksi selesai, sehingga keputusan bersamaan diproses sekali (AC-72.07). */
  async lockByProcess(tx: Tx, processInstanceId: string): Promise<ApplicationApprovalRow[]> {
    return tx
      .select(columns)
      .from(applicationApprovals)
      .where(eq(applicationApprovals.processInstanceId, processInstanceId))
      .orderBy(asc(applicationApprovals.sequence))
      .for("update");
  }

  /** Keputusan satu posisi rantai oleh approver-nya (api-specs 16 §16.6). */
  async decide(
    tx: Tx,
    id: string,
    decision: { decision: ApprovalDecision; comment: string; decidedAt: Date },
    actorId: string,
  ): Promise<void> {
    await tx
      .update(applicationApprovals)
      .set({ ...decision, updatedAt: decision.decidedAt, updatedBy: actorId })
      .where(eq(applicationApprovals.id, id));
  }

  /** ProcessInstance terbaru pengajuan yang sudah sampai langkah APPROVAL; id UUID v7 urut waktu. */
  async latestProcessOf(tx: Tx, applicationId: string): Promise<string | null> {
    const [latest] = await tx
      .select({ processInstanceId: applicationApprovals.processInstanceId })
      .from(applicationApprovals)
      .where(eq(applicationApprovals.applicationId, applicationId))
      .orderBy(desc(applicationApprovals.processInstanceId))
      .limit(1);
    return latest?.processInstanceId ?? null;
  }

  /** Rantai ProcessInstance terbaru pengajuan yang sudah sampai langkah APPROVAL; id UUID v7 urut waktu. */
  async listLatestByApplication(tx: Tx, applicationId: string): Promise<ApplicationApprovalRow[]> {
    const processInstanceId = await this.latestProcessOf(tx, applicationId);
    return processInstanceId ? this.listByProcess(tx, processInstanceId) : [];
  }
}
