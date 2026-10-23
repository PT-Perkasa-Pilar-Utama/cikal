import type { ProductCategory, ProductCreateRequest } from "@cikal/contracts";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { createRole, createSession, type TestSession } from "./session.js";

/** Contoh produk KTA dari AC-20.01. */
export const ktaProduct = {
  productCode: "KTA",
  productName: "Kredit Tanpa Agunan",
  productCategory: "NON_COLLATERAL",
  interestType: "EFFECTIVE",
  minPlafond: "5000000.00",
  maxPlafond: "300000000.00",
  minTenor: 6,
  maxTenor: 60,
  minAge: 21,
  maxAge: 55,
  dbrMax: "40.0000",
  limitAutoApproval: "10000000.00",
  validFrom: "2026-10-01",
} satisfies ProductCreateRequest;

let codeCounter = 0;

/** Kode produk unik per uji, 5 karakter: huruf awalan lalu angka urut. */
export function nextProductCode(prefix = "T"): string {
  codeCounter += 1;
  return `${prefix}${String(codeCounter).padStart(4, "0")}`;
}

/** Produk aktif yang ditulis langsung lewat role pemilik skema, seperti sudah disetujui Checker. */
export async function insertProduct(
  owner: pg.Pool,
  overrides: {
    productCode?: string;
    productName?: string;
    productCategory?: ProductCategory;
    maxTenor?: number;
    isActive?: boolean;
    validTo?: string;
    tenantId?: string;
  } = {},
): Promise<string> {
  const id = uuidv7();
  await owner.query(
    `insert into product.products (id, tenant_id, product_code, product_name, product_category, interest_type,
       min_plafond, max_plafond, min_tenor, max_tenor, min_age, max_age, dbr_max, limit_auto_approval, valid_from,
       valid_to, is_active)
     values ($1, $2, $3, $4, $5, 'EFFECTIVE', 5000000, 300000000, 6, $6, 21, 55, 40, 10000000, '2026-10-01', $7, $8)`,
    [
      id,
      overrides.tenantId ?? seedCompanyIds.company001,
      overrides.productCode ?? nextProductCode(),
      overrides.productName ?? ktaProduct.productName,
      overrides.productCategory ?? "NON_COLLATERAL",
      overrides.maxTenor ?? ktaProduct.maxTenor,
      overrides.validTo ?? null,
      overrides.isActive ?? true,
    ],
  );
  return id;
}

/** Satu periode pricing produk, ditulis lewat role pemilik skema (AC-97.04). */
export async function insertSubProduct(
  owner: pg.Pool,
  productId: string,
  period: { interestRate: string; validFrom: string; validTo?: string },
): Promise<void> {
  await owner.query(
    `insert into product.sub_products (id, tenant_id, product_id, interest_rate, valid_from, valid_to)
     values ($1, $2, $3, $4, $5, $6)`,
    [uuidv7(), seedCompanyIds.company001, productId, period.interestRate, period.validFrom, period.validTo ?? null],
  );
}

/** Nilai `CORE_MAX_TENOR_MONTHS` company 001 hasil seed `dev` (AC-20.07 memakai 24). */
export async function setCoreMaxTenor(owner: pg.Pool, months: number): Promise<void> {
  await owner.query(
    `update masterdata.system_parameter_values v set value = $1
       from masterdata.system_parameter_definitions d
      where d.id = v.definition_id and d.param_key = 'CORE_MAX_TENOR_MONTHS' and v.tenant_id = $2`,
    [String(months), seedCompanyIds.company001],
  );
}

/** Maker dan Checker menu Product sesuai matriks seed (api-specs 01 §1.11). */
export async function productSessions(owner: pg.Pool): Promise<{ maker: TestSession; checker: TestSession }> {
  const makerRole = await createRole(owner, "Maker Produk", [
    { menuCode: "MST-PRODUCT", view: true, create: true, update: true },
  ]);
  const checkerRole = await createRole(owner, "Checker Produk", [
    { menuCode: "MST-PRODUCT", view: true, approve: true },
  ]);
  return {
    maker: await createSession(owner, { roleId: makerRole }),
    checker: await createSession(owner, { roleId: checkerRole }),
  };
}
