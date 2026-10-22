import { productDataSchema } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ApplyResult, ChangeRequestSnapshot, EntityHandler, JsonRecord } from "../../change-request/index.js";
import { ProductsRepository } from "../db/products.repository.js";
import { ProductChecks } from "./product-checks.js";
import { revalidate } from "./revalidate.js";

/** Label modul produk dan pricing di "Audit Trail". */
export const PRODUCT_AUDIT_MODULE = "Product";

/** Handler ChangeRequest `PRODUCT` (api-specs 07 §7.1): produk baru dan perubahan produk (api-specs 08 §8.3, §8.4). */
@Injectable()
export class ProductChangeHandler implements EntityHandler {
  readonly entityType = "PRODUCT";
  readonly auditModule = PRODUCT_AUDIT_MODULE;

  constructor(
    private readonly products: ProductsRepository,
    private readonly checks: ProductChecks,
  ) {}

  displayName(newData: JsonRecord): string {
    return typeof newData.productName === "string" ? newData.productName : "";
  }

  async validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void> {
    const data = productDataSchema.parse(request.newData);
    await revalidate(async () => {
      await this.checks.assertRules(tx, data);
      if (request.entityId === null) {
        await this.checks.assertCodeUnused(tx, data.productCode, { includePending: false });
      }
    });
  }

  async apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult> {
    const data = productDataSchema.parse(request.newData);
    if (request.entityId === null) {
      const id = uuidv7();
      await this.products.insert(tx, { ...data, id, tenantId: reviewer.tenantId, userId: reviewer.userId });
      return { entityId: id };
    }
    if (!(await this.products.findById(tx, request.entityId))) throw DomainError.standard("NOT_FOUND");
    // Kode produk tidak bisa diubah (api-specs 08 §8.4), jadi hanya field lain yang diterapkan.
    const { productCode: _unchangeable, ...changes } = data;
    await this.products.update(tx, request.entityId, changes, reviewer.userId);
    return { entityId: request.entityId };
  }
}
