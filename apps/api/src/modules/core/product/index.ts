export { ProductCodes } from "./application/product-codes.js";
export { ProductRoutes, type RouteVersion } from "./application/product-routes.js";
export { ProductTerms } from "./application/product-terms.js";
/** Hanya untuk foreign key modul lain (XM-05); modul lain tidak membaca tabel ini (XM-02). */
export { productRouteVersions, products } from "./db/schema.js";
export { productData } from "./product.data.js";
export { ProductModule } from "./product.module.js";
