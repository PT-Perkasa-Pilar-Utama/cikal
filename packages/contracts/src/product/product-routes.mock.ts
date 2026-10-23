import type { AvailableProductsResponse, ProductRouteResponse } from "./product-routes.schema.js";
import { productIdMock } from "./products.mock.js";

/** Rute KTA versi 2 dengan lisensi POC: Survey tidak berlisensi sehingga tidak tampil (AC-31.08). */
export const productRouteResponseMock = {
  data: {
    productId: productIdMock,
    versionNumber: 2,
    status: "ACTIVE",
    effectiveFrom: "2026-10-15T00:00:00Z",
    pendingVersionNumber: null,
    steps: [
      {
        stepCode: "DATA_ENTRY",
        moduleCode: "CORE",
        order: 1,
        isEnabled: true,
        isMandatory: true,
        isConditional: false,
      },
      { stepCode: "DEDUP", moduleCode: "M06", order: 3, isEnabled: true, isMandatory: false, isConditional: false },
      { stepCode: "DUKCAPIL", moduleCode: "M07", order: 4, isEnabled: true, isMandatory: false, isConditional: false },
      {
        stepCode: "VERIFICATION",
        moduleCode: "CORE",
        order: 6,
        isEnabled: true,
        isMandatory: false,
        isConditional: false,
      },
      { stepCode: "FRAUD", moduleCode: "M08", order: 7, isEnabled: true, isMandatory: false, isConditional: false },
      { stepCode: "RAC", moduleCode: "M09", order: 8, isEnabled: true, isMandatory: false, isConditional: false },
      { stepCode: "SCORING", moduleCode: "M09", order: 9, isEnabled: true, isMandatory: false, isConditional: false },
      {
        stepCode: "CREDIT_BUREAU",
        moduleCode: "M10",
        order: 10,
        isEnabled: false,
        isMandatory: false,
        isConditional: false,
      },
      { stepCode: "DECISION", moduleCode: "M11", order: 11, isEnabled: true, isMandatory: false, isConditional: false },
      { stepCode: "APPROVAL", moduleCode: "CORE", order: 13, isEnabled: true, isMandatory: true, isConditional: false },
      {
        stepCode: "VALIDITY_CHECK",
        moduleCode: "M15",
        order: 15,
        isEnabled: true,
        isMandatory: true,
        isConditional: false,
      },
      {
        stepCode: "PRINT_AKAD",
        moduleCode: "M15",
        order: 16,
        isEnabled: true,
        isMandatory: true,
        isConditional: false,
      },
      {
        stepCode: "DISBURSEMENT",
        moduleCode: "M15",
        order: 17,
        isEnabled: true,
        isMandatory: true,
        isConditional: false,
      },
      {
        stepCode: "WAIT_CORE",
        moduleCode: "M15",
        order: 18,
        isEnabled: true,
        isMandatory: false,
        isConditional: false,
      },
    ],
  },
} satisfies ProductRouteResponse;

export const availableProductsResponseMock = {
  data: [
    {
      id: productIdMock,
      productCode: "KTA",
      productName: "Kredit Tanpa Agunan",
      interestType: "EFFECTIVE",
      minPlafond: "5000000.00",
      maxPlafond: "300000000.00",
      minTenor: 6,
      maxTenor: 60,
      minAge: 21,
      maxAge: 55,
      currentInterestRate: "14.0000",
    },
  ],
} satisfies AvailableProductsResponse;
