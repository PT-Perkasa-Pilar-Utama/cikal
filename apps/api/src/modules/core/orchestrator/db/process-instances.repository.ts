import type { ProcessStatus } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { processInstances } from "./schema.js";

export type ProcessRow = Pick<
  typeof processInstances.$inferSelect,
  | "id"
  | "tenantId"
  | "applicationId"
  | "loanId"
  | "recontestNumber"
  | "routeVersionId"
  | "formulaVersions"
  | "parameterSnapshot"
  | "status"
  | "startedAt"
>;

const processColumns = {
  id: processInstances.id,
  tenantId: processInstances.tenantId,
  applicationId: processInstances.applicationId,
  loanId: processInstances.loanId,
  recontestNumber: processInstances.recontestNumber,
  routeVersionId: processInstances.routeVersionId,
  formulaVersions: processInstances.formulaVersions,
  parameterSnapshot: processInstances.parameterSnapshot,
  status: processInstances.status,
  startedAt: processInstances.startedAt,
};

const ACTIVE: ProcessStatus[] = ["RUNNING", "WAITING"];

/** Akses tabel `orchestrator.process_instances` (technical-specs 06 §6.10). */
@Injectable()
export class ProcessInstancesRepository {
  async insert(tx: Tx, row: ProcessRow & { createdBy: string | null }): Promise<void> {
    await tx.insert(processInstances).values(row);
  }

  /** Satu langkah berjalan per proses: baris dikunci sampai transaksi selesai (technical-specs 12 §12.1). */
  async lock(tx: Tx, id: string): Promise<ProcessRow | null> {
    const [row] = await tx
      .select(processColumns)
      .from(processInstances)
      .where(eq(processInstances.id, id))
      .for("update");
    return row ?? null;
  }

  async hasActive(tx: Tx, applicationId: string): Promise<boolean> {
    const rows = await tx
      .select({ id: processInstances.id })
      .from(processInstances)
      .where(and(eq(processInstances.applicationId, applicationId), inArray(processInstances.status, ACTIVE)));
    return rows.length > 0;
  }

  /** Proses awal lalu setiap recontest, urut waktu mulai (AC-85.03). */
  async listByApplication(tx: Tx, applicationId: string): Promise<ProcessRow[]> {
    return tx
      .select(processColumns)
      .from(processInstances)
      .where(eq(processInstances.applicationId, applicationId))
      .orderBy(asc(processInstances.startedAt), asc(processInstances.id));
  }

  /** Proses dihentikan dari Process Monitoring dengan alasan (api-specs 13 §13.5). */
  async finish(tx: Tx, id: string, reason: string, userId: string): Promise<void> {
    const now = new Date();
    await tx
      .update(processInstances)
      .set({ status: "CANCELLED", finishReason: reason, endedAt: now, updatedAt: now, updatedBy: userId })
      .where(eq(processInstances.id, id));
  }

  async updateStatus(tx: Tx, id: string, status: ProcessStatus, endedAt: Date | null): Promise<void> {
    await tx
      .update(processInstances)
      .set({ status, endedAt, updatedAt: new Date() })
      .where(eq(processInstances.id, id));
  }
}
