import { APPLICATION_SECTION_MESSAGES, type ApplicationSectionInput } from "@cikal/contracts";
import { Decimal } from "decimal.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { formatAmount } from "./amount.js";
import { requiredFieldsError } from "./required-fields.js";

/** Batas plafon dan tenor produk (AC-39.03). */
export interface ProductLimits {
  minPlafond: string;
  maxPlafond: string;
  minTenor: number;
  maxTenor: number;
}

type ApplicationFields = Pick<
  ApplicationSectionInput,
  "applicationType" | "productCategory" | "productId" | "segment" | "tenorProposed" | "requestedLimit"
>;

/** Field wajib section Application mode strict (api-specs 12 §12.3, AC-39.02). */
export function applicationRequiredError(input: ApplicationFields): DomainError | null {
  const { applicationType, productCategory, productId, segment, tenorProposed, requestedLimit } = input;
  return requiredFieldsError({ applicationType, productCategory, productId, segment, tenorProposed, requestedLimit });
}

/**
 * Plafon dan tenor di luar batas produk, batas inklusif (AC-39.03, TRM_APP_001 s.d. 008); field kosong sudah
 * ditolak `applicationRequiredError`. `null` bila lolos.
 */
export function applicationLimitError(
  input: Pick<ApplicationFields, "requestedLimit" | "tenorProposed">,
  product: ProductLimits,
): DomainError | null {
  const limit = new Decimal(input.requestedLimit ?? product.minPlafond);
  if (limit.lt(product.minPlafond) || limit.gt(product.maxPlafond)) {
    const message = APPLICATION_SECTION_MESSAGES.limitOutOfRange(
      formatAmount(product.minPlafond),
      formatAmount(product.maxPlafond),
    );
    return new DomainError("LIMIT_OUT_OF_RANGE", message, 422);
  }
  const tenor = input.tenorProposed ?? product.minTenor;
  if (tenor < product.minTenor || tenor > product.maxTenor) {
    const message = APPLICATION_SECTION_MESSAGES.tenorOutOfRange(product.minTenor, product.maxTenor);
    return new DomainError("TENOR_OUT_OF_RANGE", message, 422);
  }
  return null;
}
