import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationDocumentReview } from "../../application/index.js";
import { type FileAccessPolicy, FileAccessRegistry } from "../../document/index.js";
import { TaskQueue } from "../../task-queue/index.js";
import { VERIFICATION_QUEUE } from "./verification-step-handler.js";

/** Verifikator melihat file dokumen pengajuan yang tugas verifikasinya sedang ia kerjakan (api-specs 10 §10.1, AC-64.05). */
@Injectable()
export class VerificationFileAccess implements FileAccessPolicy, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRegistry,
    private readonly review: ApplicationDocumentReview,
    private readonly tasks: TaskQueue,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean> {
    const applicationId = await this.review.applicationOfFile(tx, fileId);
    if (!applicationId) return false;
    const task = await this.tasks.openTaskOf(tx, { applicationId, queueCode: VERIFICATION_QUEUE });
    return task?.status === "ASSIGNED" && task.assignedUserId === ctx.userId;
  }
}
