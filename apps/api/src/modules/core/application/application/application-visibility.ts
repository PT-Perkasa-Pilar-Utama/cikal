import type { ApplicationStatus } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { BranchDirectory } from "../../organization/index.js";

/** Kolom pengajuan yang menentukan siapa boleh melihatnya. */
export interface VisibleApplication {
  status: ApplicationStatus;
  /** Kolom audit `created_by` boleh kosong. */
  createdBy: string | null;
  branchId: string | null;
}

/**
 * Pengajuan yang terlihat lewat `APP-INQUIRY` VIEW (api-specs 12 §12.9, 17 §17.1): draft hanya untuk pembuatnya,
 * pengajuan lain dalam lingkup data user (TN-02).
 */
@Injectable()
export class ApplicationVisibility {
  constructor(
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    private readonly branches: BranchDirectory,
  ) {}

  /**
   * Slot dokumen pengajuan (api-specs 12 §12.6): pembuat draft dengan `APP-ENTRY` VIEW, atau pembaca `APP-INQUIRY`.
   * User tanpa View di kedua menu ditolak guard seperti rute ber-`@Requires` (`ACCESS_DENIED`).
   */
  async canViewDocuments(tx: Tx, ctx: RequestContext, application: VisibleApplication): Promise<boolean> {
    const entry = await this.access.allows(ctx, "APP-ENTRY", "VIEW");
    if (!entry) await this.access.authorize(ctx, "APP-INQUIRY", "VIEW");
    if (entry && application.createdBy === ctx.userId) return true;
    return this.canInquire(tx, ctx, application);
  }

  async canInquire(tx: Tx, ctx: RequestContext, application: VisibleApplication): Promise<boolean> {
    if (!(await this.access.allows(ctx, "APP-INQUIRY", "VIEW"))) return false;
    if (application.status === "DRAFT") return application.createdBy === ctx.userId;
    const scope = await this.branches.dataScope(tx, ctx.userId);
    return scope === "ALL" || (application.branchId !== null && scope.includes(application.branchId));
  }
}
