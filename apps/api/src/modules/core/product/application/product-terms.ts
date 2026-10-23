import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProductsRepository } from "../db/products.repository.js";
import { SubProductsRepository } from "../db/sub-products.repository.js";
import { pricingOn, productTermVariables } from "../domain/product-terms.js";

/** Snapshot parameter produk dan pricing untuk ProcessInstance (grooming v1 A-36, PR-06). */
@Injectable()
export class ProductTerms {
  constructor(
    private readonly products: ProductsRepository,
    private readonly subProducts: SubProductsRepository,
  ) {}

  /** Nilai yang berlaku pada tanggal bisnis `date`; perubahan produk sesudahnya tidak mengubah snapshot (AC-20.08). */
  async snapshot(tx: Tx, productId: string, date: string): Promise<Record<string, string>> {
    const product = await this.products.findById(tx, productId);
    // Foreign key pengajuan menjamin produk ada di tenant yang sama.
    if (!product) throw new Error(`Product ${productId} not found`);
    const pricing = pricingOn(await this.subProducts.listByProduct(tx, productId), date);
    return productTermVariables(product, pricing);
  }
}
