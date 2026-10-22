import type { ProductPricingData } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { subProducts } from "./schema.js";

type SubProductData = ProductPricingData["subProducts"][number];
export type SubProductRow = SubProductData & { id: string };

/** Akses tabel `product.sub_products` (technical-specs 06 §6.7). */
@Injectable()
export class SubProductsRepository {
  async listByProduct(tx: Tx, productId: string): Promise<SubProductRow[]> {
    return tx
      .select({
        id: subProducts.id,
        interestRate: subProducts.interestRate,
        floatingRate: subProducts.floatingRate,
        capRate: subProducts.capRate,
        tenorFixed: subProducts.tenorFixed,
        approverRateMin: subProducts.approverRateMin,
        approverRateMax: subProducts.approverRateMax,
        validFrom: subProducts.validFrom,
        validTo: subProducts.validTo,
      })
      .from(subProducts)
      .where(eq(subProducts.productId, productId))
      .orderBy(asc(subProducts.validFrom));
  }

  /**
   * Pricing yang disetujui menggantikan seluruh periode produk (AC-97.01). Pengajuan yang sudah disubmit tidak
   * terpengaruh karena suku bunganya dikunci di snapshot (PR-06).
   */
  async replaceForProduct(
    tx: Tx,
    target: { productId: string; tenantId: string; userId: string },
    rows: readonly SubProductData[],
  ): Promise<void> {
    await tx.delete(subProducts).where(eq(subProducts.productId, target.productId));
    await tx.insert(subProducts).values(
      rows.map((row) => ({
        ...row,
        id: uuidv7(),
        tenantId: target.tenantId,
        productId: target.productId,
        createdBy: target.userId,
        updatedBy: target.userId,
      })),
    );
  }
}
