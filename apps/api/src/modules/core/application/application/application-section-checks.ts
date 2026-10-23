import {
  APPLICATION_DRAFT_MESSAGES,
  APPLICATION_SECTION_MESSAGES,
  type ApplicationSectionInput,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { Insurances } from "../../masterdata/index.js";
import { type AvailableProduct, ProductAvailability } from "../../product/index.js";
import { applicationLimitError } from "../domain/application-section-rules.js";
import { type ApplicationMinimum, applicationMinimum } from "../domain/draft-minimum.js";

type ApplicationChecked = Pick<ApplicationSectionInput, "requestedLimit" | "tenorProposed" | "insuranceId"> &
  Partial<ApplicationMinimum>;

/**
 * Aturan section Application yang butuh database, dipakai `POST /applications` dan simpan section (api-specs 12
 * §12.2 langkah 2 dan 3, §12.3): produk tersedia (RT-07), batas produk saat `strict`, lalu asuransi aktif.
 */
@Injectable()
export class ApplicationSectionChecks {
  constructor(
    private readonly products: ProductAvailability,
    private readonly insurances: Insurances,
  ) {}

  async check(tx: Tx, input: ApplicationChecked, strict: boolean, today: string): Promise<AvailableProduct> {
    const minimum = applicationMinimum(input);
    const product = await this.products.find(tx, minimum.productId, today);
    if (!product || product.productCategory !== minimum.productCategory) {
      throw new DomainError("PRODUCT_NOT_AVAILABLE", APPLICATION_DRAFT_MESSAGES.productNotAvailable, 422);
    }
    const limit = strict ? applicationLimitError(input, product) : null;
    if (limit) throw limit;
    if (input.insuranceId !== undefined && !(await this.insurances.isSelectable(tx, input.insuranceId))) {
      throw DomainError.standard("VALIDATION_FAILED", undefined, [
        { field: "insuranceId", code: "INVALID", message: APPLICATION_SECTION_MESSAGES.insuranceNotAvailable },
      ]);
    }
    return product;
  }
}
