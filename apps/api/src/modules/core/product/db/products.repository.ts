import type { ProductCategory, ProductData } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, exists, gte, ilike, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { productRoutes, productRouteVersions, products } from "./schema.js";

export interface ProductFilter {
  q?: string;
  productCategory?: ProductCategory;
  isActive?: boolean;
}

export interface ProductPage {
  offset: number;
  limit: number;
  sort: "productCode" | "productName";
  direction: "asc" | "desc";
}

export type ProductRow = ProductData & { id: string; updatedAt: Date };
export type ProductListRow = Pick<
  ProductRow,
  | "id"
  | "productCode"
  | "productName"
  | "productCategory"
  | "interestType"
  | "minPlafond"
  | "maxPlafond"
  | "minTenor"
  | "maxTenor"
  | "isActive"
>;
export type AvailableProductRow = Pick<
  ProductRow,
  | "id"
  | "productCode"
  | "productName"
  | "interestType"
  | "minPlafond"
  | "maxPlafond"
  | "minTenor"
  | "maxTenor"
  | "minAge"
  | "maxAge"
>;

/** Kolom `ProductData` dalam urutan kontrak, ditambah id dan waktu ubah. */
const productColumns = {
  id: products.id,
  productCode: products.productCode,
  productName: products.productName,
  productCategory: products.productCategory,
  interestType: products.interestType,
  contractType: products.contractType,
  minPlafond: products.minPlafond,
  maxPlafond: products.maxPlafond,
  minTenor: products.minTenor,
  maxTenor: products.maxTenor,
  minAge: products.minAge,
  maxAge: products.maxAge,
  maxAgeAtMaturityMonth: products.maxAgeAtMaturityMonth,
  dbrMax: products.dbrMax,
  dsr: products.dsr,
  multipleSalaryDbr: products.multipleSalaryDbr,
  adminFee: products.adminFee,
  provisionFee: products.provisionFee,
  salesFee: products.salesFee,
  limitAutoApproval: products.limitAutoApproval,
  scoringApproval: products.scoringApproval,
  isPaylater: products.isPaylater,
  validFrom: products.validFrom,
  validTo: products.validTo,
  isActive: products.isActive,
  updatedAt: products.updatedAt,
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** Akses tabel `product.products` (technical-specs 06 §6.7). */
@Injectable()
export class ProductsRepository {
  async list(tx: Tx, filter: ProductFilter, page: ProductPage): Promise<ProductListRow[]> {
    const order = page.direction === "asc" ? asc : desc;
    return tx
      .select({
        id: products.id,
        productCode: products.productCode,
        productName: products.productName,
        productCategory: products.productCategory,
        interestType: products.interestType,
        minPlafond: products.minPlafond,
        maxPlafond: products.maxPlafond,
        minTenor: products.minTenor,
        maxTenor: products.maxTenor,
        isActive: products.isActive,
      })
      .from(products)
      .where(this.matching(filter))
      .orderBy(order(products[page.sort]), asc(products.id))
      .limit(page.limit)
      .offset(page.offset);
  }

  async count(tx: Tx, filter: ProductFilter): Promise<number> {
    const [row] = await tx.select({ total: count() }).from(products).where(this.matching(filter));
    return row?.total ?? 0;
  }

  /**
   * Produk aktif kategori ini yang berlaku pada tanggal bisnis `today` dan punya versi rute ACTIVE (api-specs 08
   * §8.7, RT-07).
   */
  async listAvailable(tx: Tx, productCategory: ProductCategory, today: string): Promise<AvailableProductRow[]> {
    const activeRoute = tx
      .select({ id: productRouteVersions.id })
      .from(productRoutes)
      .innerJoin(productRouteVersions, eq(productRouteVersions.routeId, productRoutes.id))
      .where(and(eq(productRoutes.productId, products.id), eq(productRouteVersions.status, "ACTIVE")));
    return tx
      .select({
        id: products.id,
        productCode: products.productCode,
        productName: products.productName,
        interestType: products.interestType,
        minPlafond: products.minPlafond,
        maxPlafond: products.maxPlafond,
        minTenor: products.minTenor,
        maxTenor: products.maxTenor,
        minAge: products.minAge,
        maxAge: products.maxAge,
      })
      .from(products)
      .where(
        and(
          eq(products.productCategory, productCategory),
          eq(products.isActive, true),
          lte(products.validFrom, today),
          or(isNull(products.validTo), gte(products.validTo, today)),
          exists(activeRoute),
        ),
      )
      .orderBy(asc(products.productName), asc(products.id));
  }

  async findById(tx: Tx, id: string): Promise<ProductRow | null> {
    const [row] = await tx.select(productColumns).from(products).where(eq(products.id, id));
    return row ?? null;
  }

  /** Kode dipakai produk lain tanpa membedakan huruf besar dan kecil (AC-20.03). */
  async codeExists(tx: Tx, productCode: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: products.id })
      .from(products)
      .where(sql`upper(${products.productCode}) = upper(${productCode})`)
      .limit(1);
    return row !== undefined;
  }

  async insert(tx: Tx, row: ProductData & { id: string; tenantId: string; userId: string }): Promise<void> {
    const { userId, ...values } = row;
    await tx.insert(products).values({ ...values, createdBy: userId, updatedBy: userId });
  }

  async update(tx: Tx, id: string, data: Partial<ProductData>, userId: string): Promise<void> {
    await tx
      .update(products)
      .set({ ...data, updatedAt: new Date(), updatedBy: userId })
      .where(eq(products.id, id));
  }

  private matching(filter: ProductFilter): SQL | undefined {
    const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
    return and(
      pattern ? or(ilike(products.productCode, pattern), ilike(products.productName, pattern)) : undefined,
      filter.productCategory ? eq(products.productCategory, filter.productCategory) : undefined,
      filter.isActive === undefined ? undefined : eq(products.isActive, filter.isActive),
    );
  }
}
