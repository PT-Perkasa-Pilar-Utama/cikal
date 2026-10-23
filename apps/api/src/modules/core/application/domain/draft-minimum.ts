import { APPLICATION_DRAFT_MESSAGES, type ApplicationDraftCreateRequest, type ProductCategory } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Field minimum draft di section Application (A-15). */
export interface ApplicationMinimum {
  applicationType: string;
  productCategory: ProductCategory;
  productId: string;
}

/** Field minimum draft di section Personal (A-15). */
export interface PersonalMinimum {
  idType: "KTP";
  idCardNumber: string;
  fullName: string;
  fullNameId: string;
}

/** Tujuh field minimum draft (A-15) setelah dipastikan terisi. */
export type DraftMinimum = ApplicationMinimum & PersonalMinimum;

const filled = (value: string | undefined): value is string => value !== undefined && value !== "";
const minimumError = () => new DomainError("DRAFT_MINIMUM_FIELDS", APPLICATION_DRAFT_MESSAGES.draftMinimumFields, 422);

/** Field minimum section Application; satu saja kosong = `422 DRAFT_MINIMUM_FIELDS` (AC-49.02). */
export function applicationMinimum(input: Partial<ApplicationMinimum>): ApplicationMinimum {
  const { applicationType, productCategory, productId } = input;
  if (!filled(applicationType) || productCategory === undefined || productId === undefined) throw minimumError();
  return { applicationType, productCategory, productId };
}

/** Field minimum section Personal; satu saja kosong = `422 DRAFT_MINIMUM_FIELDS` (AC-49.02). */
export function personalMinimum(input: Partial<PersonalMinimum>): PersonalMinimum {
  const { idType, idCardNumber, fullName, fullNameId } = input;
  if (idType === undefined || !filled(idCardNumber) || !filled(fullName) || !filled(fullNameId)) {
    throw minimumError();
  }
  return { idType, idCardNumber, fullName, fullNameId };
}

/** Field minimum draft pertama; satu saja kosong = `422 DRAFT_MINIMUM_FIELDS` (AC-49.02). */
export function draftMinimum(request: ApplicationDraftCreateRequest): DraftMinimum {
  return { ...applicationMinimum(request.application), ...personalMinimum(request.personal) };
}
