import type { ProductDetailResponse, ProductListResponse, ProductPricingResponse } from "./products.schema.js";

export const productIdMock = "0192b6a5-0001-7000-8000-000000000001";

export const productListResponseMock = {
  data: [
    {
      id: productIdMock,
      productCode: "KTA",
      productName: "Kredit Tanpa Agunan",
      productCategory: "NON_COLLATERAL",
      interestType: "EFFECTIVE",
      minPlafond: "5000000.00",
      maxPlafond: "300000000.00",
      minTenor: 6,
      maxTenor: 60,
      isActive: true,
      hasActiveRoute: true,
      hasPendingChange: false,
    },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
} satisfies ProductListResponse;

export const productDetailResponseMock = {
  data: {
    id: productIdMock,
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
    adminFee: "250000.00",
    provisionFee: "1.0000",
    limitAutoApproval: "10000000.00",
    validFrom: "2026-10-01",
    isActive: true,
    hasActiveRoute: true,
    hasPendingChange: false,
    updatedAt: "2026-10-21T03:15:00Z",
  },
} satisfies ProductDetailResponse;

export const productPricingResponseMock = {
  data: {
    productId: productIdMock,
    interestType: "EFFECTIVE",
    adminFee: "250000.00",
    provisionFee: "1.0000",
    salesFee: null,
    subProducts: [
      {
        id: "0192b6a6-0001-7000-8000-000000000001",
        interestRate: "12.0000",
        floatingRate: null,
        capRate: null,
        tenorFixed: null,
        approverRateMin: "11.0000",
        approverRateMax: "15.0000",
        validFrom: "2026-10-01",
        validTo: "2026-12-31",
      },
      {
        id: "0192b6a6-0002-7000-8000-000000000002",
        interestRate: "14.0000",
        floatingRate: null,
        capRate: null,
        tenorFixed: null,
        approverRateMin: "11.0000",
        approverRateMax: "15.0000",
        validFrom: "2027-01-01",
        validTo: null,
      },
    ],
    hasPendingChange: false,
  },
} satisfies ProductPricingResponse;
