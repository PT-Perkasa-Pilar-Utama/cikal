import { Module } from "@nestjs/common";
import { ProductsController } from "./http/products.controller.js";

/** Product & Route: produk, harga, rute berversi, checklist dokumen (technical-specs 05 §5.5). */
@Module({
  controllers: [ProductsController],
})
export class ProductModule {}
