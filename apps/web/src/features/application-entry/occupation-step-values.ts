import type { OccupationSectionInput } from "@cikal/contracts";
import { type AddressValues, addressInput } from "./address-values";
import { moneyInput, textInput } from "./form-input";

/** Field `occupation` dari form ditambah alamat perusahaan yang dikelola state (api-specs 12 §12.3). */
export function readOccupationStep(form: HTMLFormElement, companyAddress: AddressValues): OccupationSectionInput {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  const { address, provinceCode, cityCode, districtCode, subDistrictCode, zipCode } = addressInput(companyAddress);
  return {
    sourceOfIncome: text("sourceOfIncome"),
    occupation: text("occupation"),
    industryOfProfession: text("industryOfProfession"),
    position: text("position"),
    tenureAtCurrentJob: text("tenureAtCurrentJob"),
    monthlyIncomeAllowance: moneyInput(data, "monthlyIncomeAllowance"),
    organization: text("organization"),
    previousEmployer: text("previousEmployer"),
    pensionInstance: text("pensionInstance"),
    company: {
      name: text("companyName"),
      phoneNumber: text("companyPhoneNumber"),
      address,
      provinceCode,
      cityCode,
      districtCode,
      subDistrictCode,
      zipCode,
    },
  };
}
