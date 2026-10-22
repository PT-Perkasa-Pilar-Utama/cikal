import { type ChangeRequestAccepted, type ProductUpdateRequest, productDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { CHANGE_REQUEST_MESSAGES, SubmitChangeRequest } from "../../change-request/index.js";
import { ProductsRepository } from "../db/products.repository.js";
import { productCodeChangedError, productError, sameProductData, toProductData } from "../domain/product-rules.js";
import { ProductChecks } from "./product-checks.js";

/**
 * Maker mengubah atau menonaktifkan produk lewat ChangeRequest `PRODUCT`/`UPDATE` (api-specs 08 §8.4).
 * Pengajuan yang sudah disubmit tidak terpengaruh karena nilainya dikunci di snapshot (AC-20.08, PR-06).
 */
@Injectable()
export class RequestProductUpdateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly products: ProductsRepository,
    private readonly checks: ProductChecks,
    private readonly submit: SubmitChangeRequest,
  ) {}

  execute(ctx: RequestContext, id: string, body: ProductUpdateRequest): Promise<ChangeRequestAccepted> {
    const proposed = toProductData(body);
    return this.db.withTenantTx(ctx, async (tx) => {
      const product = await this.products.findById(tx, id);
      if (!product) throw DomainError.standard("NOT_FOUND");
      await this.checks.assertNoPendingChange(tx, id);
      const current = productDataSchema.parse(product);
      if (proposed.productCode !== current.productCode) throw productCodeChangedError();
      await this.checks.assertRules(tx, proposed);
      if (sameProductData(current, proposed)) throw productError("NO_CHANGES");
      const accepted = await this.submit.execute(tx, ctx, {
        entityType: "PRODUCT",
        entityId: id,
        oldData: current,
        newData: proposed,
      });
      return { data: accepted, message: CHANGE_REQUEST_MESSAGES.submitted };
    });
  }
}
