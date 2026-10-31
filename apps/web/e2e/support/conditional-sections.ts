import type { BusinessSectionInput, CollateralSectionInput, SpouseSectionInput } from "@cikal/contracts";

/* Body section Spouse, Business, dan Collateral untuk draft e2e (api-specs 12 §12.3). */

/** Pasangan AC-43.01. */
export const spouseSection: SpouseSectionInput = {
  fullName: "Sri Wahyuni",
  idNumber: "3273015506920002",
  dateOfBirth: "1992-06-15",
  prenuptialAgreement: "N",
  idAddress: {},
  company: {},
};

/** Usaha AC-45.01. */
export const businessSection: BusinessSectionInput = {
  businessName: "Toko Sumber Rejeki",
  businessField: "001",
  annualSales: "600000000.00",
  businessLaunchDate: "2018-03-01",
  address: {
    address: "Jl. Pasar Baru 7",
    provinceCode: "31",
    cityCode: "3171",
    districtCode: "317101",
    subDistrictCode: "3171011001",
    zipCode: "10110",
  },
};

/** Agunan SK pensiun AC-46.03; produk e2e berkategori Non Collateral sehingga section ini tidak dipakai. */
export const collateralSection: CollateralSectionInput = {
  collateralType: "PENSION_DECREE",
  decreeNumber: "SK-123/2020",
  decreeDate: "2020-05-01",
  address: {},
};
