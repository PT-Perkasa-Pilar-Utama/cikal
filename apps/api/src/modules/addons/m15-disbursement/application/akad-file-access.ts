import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { type FileAccessPolicy, FileAccessRegistry } from "../../../core/document/index.js";
import { AkadPrintsRepository } from "../db/akad-prints.repository.js";

const AKAD_READERS = [
  ["OPS-PRINT-AKAD", "VIEW"],
  ["OPS-DISBURSEMENT", "VIEW"],
  ["APP-INQUIRY", "VIEW"],
] as const;

/** PDF akad terlihat oleh Print Akad, Disbursement, dan pembaca `APP-INQUIRY` (api-specs 10 §10.1, §25.3). */
@Injectable()
export class AkadFileAccess implements FileAccessPolicy, OnModuleInit {
  constructor(
    private readonly registry: FileAccessRegistry,
    private readonly prints: AkadPrintsRepository,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean> {
    if (!(await this.prints.isAkadFile(tx, fileId))) return false;
    for (const [menu, action] of AKAD_READERS) {
      if (await this.access.allows(ctx, menu, action)) return true;
    }
    return false;
  }
}
