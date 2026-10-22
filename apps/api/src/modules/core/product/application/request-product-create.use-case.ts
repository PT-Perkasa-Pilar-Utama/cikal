import type { ChangeRequestAccepted, ProductCreateRequest } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { toProductData } from "../domain/product-rules.js";
import { ProductChecks } from "./product-checks.js";

/** Maker membuat produk baru lewat ChangeRequest `PRODUCT`/`CREATE` (api-specs 08 §8.3, AC-20.01). */
@Injectable()
export class RequestProductCreateUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly checks: ProductChecks,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
  ) {}

  execute(ctx: RequestContext, body: ProductCreateRequest): Promise<ChangeRequestAccepted> {
    const data = toProductData(body);
    return this.db.withTenantTx(ctx, async (tx) => {
      await this.checks.assertRules(tx, data);
      await this.checks.assertCodeUnused(tx, data.productCode, { includePending: true });
      return this.changeRequests.submit(tx, ctx, {
        entityType: "PRODUCT",
        entityId: null,
        oldData: null,
        newData: data,
      });
    });
  }
}
