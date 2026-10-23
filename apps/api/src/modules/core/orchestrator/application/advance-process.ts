import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import { ProcessInstancesRepository } from "../db/process-instances.repository.js";
import { StepRunner } from "./step-runner.js";

/**
 * `advance(processId)` dari job pg-boss (technical-specs 12 §12.3). Idempoten: job ganda atau terlambat pada proses
 * yang menunggu, selesai, atau batal tidak mengubah apa pun.
 */
@Injectable()
export class AdvanceProcess {
  constructor(
    private readonly db: TenantTx,
    private readonly processes: ProcessInstancesRepository,
    private readonly runner: StepRunner,
  ) {}

  execute(tenantId: string, processInstanceId: string): Promise<void> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const process = await this.processes.lock(tx, processInstanceId);
      // Tanpa baris di tenant payload, job gagal dan berakhir di dead-letter (technical-specs 12 §12.5).
      if (!process) throw new Error(`Process ${processInstanceId} not found in tenant ${tenantId}`);
      if (process.status !== "RUNNING") return;
      await this.runner.runCurrent(tx, process);
    });
  }
}
