import type { ProductData } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { ProductsRepository } from "../db/products.repository.js";
import { parseTenorLimit, productError, productRuleError } from "../domain/product-rules.js";

/** Produk dan pricing-nya berbagi satu permintaan terbuka: keduanya mengubah biaya produk yang sama. */
const PRODUCT_ENTITY_TYPES = ["PRODUCT", "PRODUCT_PRICING"] as const;

/** Aturan produk yang butuh database, dipakai saat Maker mengajukan dan saat Checker menyetujui. */
@Injectable()
export class ProductChecks {
  constructor(
    private readonly products: ProductsRepository,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  /** Aturan api-specs 08 §8.3 langkah 1 s.d. 4 dengan `CORE_MAX_TENOR_MONTHS` tenant (AC-20.07). */
  async assertRules(tx: Tx, data: ProductData): Promise<void> {
    const limit = parseTenorLimit(await this.parameters.value(tx, "CORE_MAX_TENOR_MONTHS"));
    const error = productRuleError(data, limit);
    if (error) throw error;
  }

  /**
   * Langkah 5: kode belum dipakai produk lain. Saat Maker mengajukan, kode yang masih menunggu persetujuan juga
   * dihitung; saat Checker menyetujui, permintaan itu sendiri yang membawa kodenya.
   */
  async assertCodeUnused(tx: Tx, productCode: string, options: { includePending: boolean }): Promise<void> {
    const pending = options.includePending && (await this.changeRequests.hasProposed(tx, "PRODUCT", { productCode }));
    if (pending || (await this.products.codeExists(tx, productCode))) throw productError("PRODUCT_CODE_EXISTS");
  }

  /** Satu permintaan terbuka per produk, termasuk pricing-nya (AC-12.06). */
  async assertNoPendingChange(tx: Tx, productId: string): Promise<void> {
    const open = await this.changeRequests.pendingEntityIds(tx, PRODUCT_ENTITY_TYPES, [productId]);
    if (open.has(productId)) throw DomainError.standard("PENDING_CHANGE_REQUEST");
  }

  /** Id produk yang punya perubahan menunggu persetujuan, untuk `hasPendingChange`. */
  pendingProductIds(tx: Tx, productIds: readonly string[]): Promise<Set<string>> {
    return this.changeRequests.pendingEntityIds(tx, PRODUCT_ENTITY_TYPES, productIds);
  }
}
