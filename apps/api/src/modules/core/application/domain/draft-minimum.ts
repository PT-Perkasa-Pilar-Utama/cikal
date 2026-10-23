import { APPLICATION_DRAFT_MESSAGES, type ApplicationDraftCreateRequest, type ProductCategory } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** Tujuh field minimum draft (A-15) setelah dipastikan terisi. */
export interface DraftMinimum {
  applicationType: string;
  productCategory: ProductCategory;
  productId: string;
  idType: "KTP";
  idCardNumber: string;
  fullName: string;
  fullNameId: string;
}

const filled = (value: string | undefined): value is string => value !== undefined && value !== "";

/** Field minimum draft pertama; satu saja kosong = `422 DRAFT_MINIMUM_FIELDS` (AC-49.02). */
export function draftMinimum(request: ApplicationDraftCreateRequest): DraftMinimum {
  const { applicationType, productCategory, productId } = request.application;
  const { idType, idCardNumber, fullName, fullNameId } = request.personal;
  if (
    !filled(applicationType) ||
    productCategory === undefined ||
    productId === undefined ||
    idType === undefined ||
    !filled(idCardNumber) ||
    !filled(fullName) ||
    !filled(fullNameId)
  ) {
    throw new DomainError("DRAFT_MINIMUM_FIELDS", APPLICATION_DRAFT_MESSAGES.draftMinimumFields, 422);
  }
  return { applicationType, productCategory, productId, idType, idCardNumber, fullName, fullNameId };
}
