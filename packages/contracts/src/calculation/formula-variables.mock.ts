import type { FormulaVariableListResponse } from "./formula-variables.schema.js";

/** Dropdown "Field" kriteria scoring dan RAC (AC-37.01, AC-37.02). */
export const formulaVariableListResponseMock = {
  data: [
    {
      variableCode: "OCCUPATION",
      label: "Occupation",
      dataType: "CHOICE",
      paramType: "Occupation",
      source: "APPLICATION",
    },
    {
      variableCode: "MONTHLY_INCOME",
      label: "Monthly Income",
      dataType: "MONEY",
      paramType: null,
      source: "APPLICATION",
    },
    {
      variableCode: "INSTALLMENT_TO_INCOME_RATIO",
      label: "Installment to Income Ratio (%)",
      dataType: "PERCENT",
      paramType: null,
      source: "FORMULA",
    },
    {
      variableCode: "PRODUCT_DBR_MAX",
      label: "Product DBR Max",
      dataType: "PERCENT",
      paramType: null,
      source: "PRODUCT",
    },
  ],
} satisfies FormulaVariableListResponse;
