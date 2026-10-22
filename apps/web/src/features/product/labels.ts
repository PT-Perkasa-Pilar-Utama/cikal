import type { InterestType, ProductCategory } from "@cikal/contracts";

/** Nama kategori produk; "Non Collateral Loan" dari AC-20.01, sisanya dari tile Loan Product (design-system 8.6). */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  NON_COLLATERAL: "Non Collateral Loan",
  COLLATERAL: "Collateral Loan",
  PENSION: "Pension Credit",
  SYARIAH: "Syariah Compliant Finance",
};

/** Nama jenis bunga; "Effective" dari AC-20.01. */
export const INTEREST_TYPE_LABELS: Record<InterestType, string> = {
  FLAT: "Flat",
  EFFECTIVE: "Effective",
  FLOATING: "Floating",
  HYBRID: "Hybrid",
  CAPPED: "Capped",
};

/** Label field produk dan pricing, sama dengan label form (AC-20.01, AC-97.01). */
export const PRODUCT_FIELD_LABELS: Record<string, string> = {
  productCode: "Product Code",
  productName: "Product Name",
  productCategory: "Product Category",
  interestType: "Interest Type",
  contractType: "Contract Type",
  minPlafond: "Minimal Plafond",
  maxPlafond: "Maximal Plafond",
  minTenor: "Minimum Tenor",
  maxTenor: "Maximum Tenor",
  minAge: "Minimum Age",
  maxAge: "Maximum Age",
  maxAgeAtMaturityMonth: "Maximum Age at Maturity (Months)",
  dbrMax: "DBR Max",
  dsr: "DSR",
  multipleSalaryDbr: "Multiple Salary DBR",
  adminFee: "Admin Fee",
  provisionFee: "Provision Fee (%)",
  salesFee: "Sales Fee",
  limitAutoApproval: "Limit Auto Approval",
  scoringApproval: "Scoring Approval",
  isPaylater: "Paylater",
  validFrom: "Valid From",
  validTo: "Valid To",
  isActive: "Active",
  subProducts: "Interest Rate Periods",
  interestRate: "Interest Rate (% p.a.)",
  floatingRate: "Floating Rate (%)",
  capRate: "Cap Rate (%)",
  tenorFixed: "Fixed Tenor (Months)",
  approverRateMin: "Approver Rate Min (%)",
  approverRateMax: "Approver Rate Max (%)",
};

/** Penamaan field dan nilai enum produk di layar "Pending Product" (AC-12.02). */
export const PRODUCT_PRESENTATION = {
  labels: PRODUCT_FIELD_LABELS,
  valueLabels: { productCategory: PRODUCT_CATEGORY_LABELS, interestType: INTEREST_TYPE_LABELS },
};
