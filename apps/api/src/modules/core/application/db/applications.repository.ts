import type { ApplicationStatus, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { applications } from "./schema.js";

export interface ApplicationProcessRow {
  id: string;
  tenantId: string;
  loanId: string;
  productId: string;
  status: ApplicationStatus;
  createdAt: Date;
  submittedAt: Date | null;
  submittedBy: string | null;
}

const processColumns = {
  id: applications.id,
  tenantId: applications.tenantId,
  loanId: applications.loanId,
  productId: applications.productId,
  status: applications.status,
  createdAt: applications.createdAt,
  submittedAt: applications.submittedAt,
  submittedBy: applications.submittedBy,
};

/** Akses tabel `application.applications` (technical-specs 06 §6.9). */
@Injectable()
export class ApplicationsRepository {
  async findById(tx: Tx, id: string): Promise<ApplicationProcessRow | null> {
    const [row] = await tx.select(processColumns).from(applications).where(eq(applications.id, id));
    return row ?? null;
  }

  async findMany(tx: Tx, ids: readonly string[]): Promise<ApplicationProcessRow[]> {
    if (ids.length === 0) return [];
    return tx
      .select(processColumns)
      .from(applications)
      .where(inArray(applications.id, [...ids]));
  }

  /** Mengunci baris sampai transaksi selesai agar perubahan status tidak saling menimpa. */
  async lockStatus(tx: Tx, id: string): Promise<ApplicationStatus | null> {
    const [row] = await tx
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id))
      .for("update");
    return row?.status ?? null;
  }

  async updateStatus(
    tx: Tx,
    id: string,
    changes: { status: ApplicationStatus; returnNote: string | null; currentStep?: StepCode | null },
    userId: string | null,
  ): Promise<void> {
    await tx
      .update(applications)
      .set({ ...changes, updatedAt: new Date(), updatedBy: userId })
      .where(eq(applications.id, id));
  }

  async updateCurrentStep(tx: Tx, id: string, currentStep: StepCode): Promise<void> {
    await tx.update(applications).set({ currentStep, updatedAt: new Date() }).where(eq(applications.id, id));
  }
}
