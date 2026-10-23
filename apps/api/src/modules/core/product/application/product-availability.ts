import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type ProductEligibilityRow, ProductsRepository } from "../db/products.repository.js";

/** Produk dengan syarat plafon, tenor, dan usia yang diperiksa form pengajuan (api-specs 12 §12.3). */
export type AvailableProduct = ProductEligibilityRow;

/** Produk yang boleh dipakai pengajuan baru (technical-specs 05 §5.5 `availableProducts`, RT-07). */
@Injectable()
export class ProductAvailability {
  constructor(private readonly products: ProductsRepository) {}

  /** `null` bila produk tidak aktif, di luar masa berlaku pada `today`, atau tanpa rute ACTIVE. */
  find(tx: Tx, productId: string, today: string): Promise<AvailableProduct | null> {
    return this.products.findAvailable(tx, productId, today);
  }

  /** Syarat produk draft tanpa memeriksa ketersediaan, untuk section setelah Application. */
  eligibility(tx: Tx, productId: string): Promise<AvailableProduct | null> {
    return this.products.findEligibility(tx, productId);
  }
}
