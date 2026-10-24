import {
  type ApplicationDraftCreateRequest,
  type ApplicationSectionInput,
  productCategorySchema,
} from "@cikal/contracts";
import { integerInput, moneyInput, textInput } from "./form-input";

type DraftIdentity = ApplicationDraftCreateRequest["personal"];

/**
 * Isi step Application: field section `application` (api-specs 12 §12.3) dan blok identitas pemohon yang ikut
 * `POST /applications` sebagai field minimum draft (api-specs 12 §12.2, AC-49.01).
 */
export interface ApplicationStepValues {
  application: ApplicationSectionInput;
  identity: DraftIdentity;
}

export function readApplicationStep(form: HTMLFormElement): ApplicationStepValues {
  const data = new FormData(form);
  const text = (name: string) => textInput(data, name);
  return {
    application: {
      applicationType: text("applicationType"),
      segment: text("segment"),
      productCategory: productCategorySchema.safeParse(text("productCategory")).data,
      productId: text("productId"),
      purposeOfLoan: text("purposeOfLoan"),
      tenorProposed: integerInput(data, "tenorProposed"),
      requestedLimit: moneyInput(data, "requestedLimit"),
      insuranceId: text("insuranceId"),
      sourceCode: text("sourceCode"),
      salesCode: text("salesCode"),
      referralCode: text("referralCode"),
      marketingCode: text("marketingCode"),
    },
    identity: {
      idType: text("idType") === "KTP" ? "KTP" : undefined,
      idCardNumber: text("idCardNumber"),
      fullName: text("fullName"),
      fullNameId: text("fullNameId"),
    },
  };
}
