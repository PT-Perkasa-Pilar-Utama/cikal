import type { EmergencyContactSectionInput, OccupationSectionInput, PersonalSectionInput } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { DomainError } from "../../../../platform/http/domain-error.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ProductAvailability } from "../../product/index.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { emergencyContactSectionError } from "../domain/emergency-contact-section-rules.js";
import { occupationSectionError } from "../domain/occupation-section-rules.js";
import { personalSectionError } from "../domain/personal-section-rules.js";

/**
 * Aturan strict section Personal, Occupation, dan Emergency Contact dengan produk dan parameter sistem dari
 * database (api-specs 12 §12.3). Dipakai tombol "Next" dan submit (api-specs 12 §12.8 langkah 2); `null` bila lolos.
 */
@Injectable()
export class StrictSections {
  constructor(
    private readonly products: ProductAvailability,
    private readonly personals: ApplicationPersonalsRepository,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  async personalError(
    tx: Tx,
    draft: DraftRow,
    input: PersonalSectionInput,
    today: string,
  ): Promise<DomainError | null> {
    const product = await this.products.eligibility(tx, draft.productId);
    // Foreign key pengajuan menjamin produk ada di tenant yang sama.
    if (!product) throw new Error(`Product ${draft.productId} not found`);
    const npwpMinLimit = await this.parameters.value(tx, "NPWP_MIN_LIMIT", draft.productId);
    // Definisi seed `base` punya default, jadi nilai kosong berarti konfigurasi instalasi rusak.
    if (npwpMinLimit === null) throw new Error("System parameter NPWP_MIN_LIMIT has no value");
    return personalSectionError(input, {
      today,
      requestedLimit: draft.requestedLimit,
      tenorProposed: draft.tenorProposed,
      npwpMinLimit,
      consentRequired: await this.parameters.flag(tx, "REQUIRE_CONSENT_FOR_EXTERNAL_CHECK"),
      product,
    });
  }

  async occupationError(tx: Tx, draft: DraftRow, input: OccupationSectionInput): Promise<DomainError | null> {
    return occupationSectionError(input, {
      productCategory: draft.productCategory,
      employedIncomeSources: await this.parameters.choices(tx, "EMPLOYED_INCOME_SOURCES"),
      selfEmployedOnly: await this.parameters.flag(tx, "SELF_EMPLOYED_ONLY", draft.productId),
      selfEmployedOccupations: await this.parameters.choices(tx, "SELF_EMPLOYED_OCCUPATIONS"),
    });
  }

  async emergencyContactError(
    tx: Tx,
    draft: DraftRow,
    input: EmergencyContactSectionInput,
  ): Promise<DomainError | null> {
    const personal = await this.personals.findByApplication(tx, draft.id);
    return emergencyContactSectionError(input, personal?.mobileNumber ?? null);
  }
}
