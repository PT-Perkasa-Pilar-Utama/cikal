import type { ProductCategory } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProductsRepository } from "../db/products.repository.js";

export interface AvailableProduct {
  id: string;
  productCode: string;
  productCategory: ProductCategory;
}

/** Produk yang boleh dipakai pengajuan baru (technical-specs 05 §5.5 `availableProducts`, RT-07). */
@Injectable()
export class ProductAvailability {
  constructor(private readonly products: ProductsRepository) {}

  /** `null` bila produk tidak aktif, di luar masa berlaku pada `today`, atau tanpa rute ACTIVE. */
  find(tx: Tx, productId: string, today: string): Promise<AvailableProduct | null> {
    return this.products.findAvailable(tx, productId, today);
  }
}
