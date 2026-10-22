import { Inject, Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { type ChangeRequestRow, ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { ENTITY_MENU } from "../domain/entity-menus.js";
import { REVIEW_BLOCKS, reviewBlock } from "../domain/review-policy.js";

/** Pemeriksaan bersama approve dan reject (api-specs 07 §7.4 langkah 1 dan 2, §7.5). */
@Injectable()
export class ReviewGate {
  constructor(
    private readonly db: TenantTx,
    private readonly requests: ChangeRequestsRepository,
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
  ) {}

  /**
   * Hak APPROVE pada menu entity permintaan. Diperiksa sebelum transaksi tinjauan agar kunci baris tidak ditahan
   * selama pemeriksaan hak, yang memakai koneksinya sendiri.
   */
  async authorize(ctx: RequestContext, id: string): Promise<void> {
    const request = await this.db.withTenantTx(ctx, (tx) => this.requests.findById(tx, id));
    if (!request) throw DomainError.standard("NOT_FOUND");
    await this.access.authorize(ctx, ENTITY_MENU[request.entityType], "APPROVE");
  }

  /** Mengunci baris lalu menolak permintaan yang sudah diproses (AC-12.05) atau milik peninjau (AC-12.04). */
  async lock(tx: Tx, id: string, reviewerId: string): Promise<ChangeRequestRow> {
    const request = await this.requests.lockById(tx, id);
    if (!request) throw DomainError.standard("NOT_FOUND");
    const block = reviewBlock(request, reviewerId);
    if (block) throw new DomainError(block, REVIEW_BLOCKS[block].message, REVIEW_BLOCKS[block].status);
    return request;
  }
}
