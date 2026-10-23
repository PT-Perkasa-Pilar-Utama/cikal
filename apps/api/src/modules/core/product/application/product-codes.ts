import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ProductsRepository } from "../db/products.repository.js";

/** Kode produk untuk tampilan modul lain, contoh kolom produk di antrean tugas (api-specs 14 §14.2). */
@Injectable()
export class ProductCodes {
  constructor(private readonly products: ProductsRepository) {}

  /** Produk tenant transaksi `tx`; id yang tidak ditemukan tidak ada di hasil. */
  async describe(tx: Tx, productIds: readonly string[]): Promise<Map<string, string>> {
    const rows = await this.products.findCodes(tx, [...new Set(productIds)]);
    return new Map(rows.map((row) => [row.id, row.productCode]));
  }
}
