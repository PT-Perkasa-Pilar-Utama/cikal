import type {
  BusinessSectionInput,
  CollateralSectionInput,
  CollateralType,
  EmergencyContactSectionInput,
  OccupationSectionInput,
  PersonalSectionInput,
  SpouseSectionInput,
} from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { DomainError } from "../../../../platform/http/domain-error.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ProductAvailability } from "../../product/index.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { businessSectionError } from "../domain/business-section-rules.js";
import { allowedCollateralTypes, collateralSectionError } from "../domain/collateral-section-rules.js";
import { emergencyContactSectionError } from "../domain/emergency-contact-section-rules.js";
import { occupationSectionError } from "../domain/occupation-section-rules.js";
import { personalSectionError } from "../domain/personal-section-rules.js";
import { spouseSectionError } from "../domain/spouse-section-rules.js";

/**
 * Aturan strict section form dengan produk, data pemohon, dan parameter sistem dari database (api-specs 12 §12.3). Dipakai tombol "Next" dan submit (api-specs 12 §12.8 langkah 2); `null` bila lolos.
 */
@Injectable()
export class StrictSections {
  constructor(
    private readonly products: ProductAvailability,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly encryption: TenantEncryption,
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

  /** NIK pasangan dibandingkan dengan NIK pemohon yang didekripsi (AC-43.02). */
  async spouseError(tx: Tx, draft: DraftRow, input: SpouseSectionInput): Promise<DomainError | null> {
    const personal = await this.personals.findByApplication(tx, draft.id);
    // Draft selalu punya baris Personal sejak `POST /applications`.
    if (!personal) throw new Error(`Application ${draft.id} has no personal data`);
    const nik = await this.encryption.decrypt(tx, {
      ciphertext: personal.idCardNumberEnc,
      keyVersion: personal.idCardNumberKeyVersion,
    });
    return spouseSectionError(input, nik);
  }

  async businessError(
    tx: Tx,
    draft: DraftRow,
    input: BusinessSectionInput,
    today: string,
  ): Promise<DomainError | null> {
    const minBusinessMonths = await this.parameters.value(tx, "MIN_BUSINESS_MONTHS", draft.productId);
    return businessSectionError(input, { today, minBusinessMonths: Number(minBusinessMonths ?? "0") });
  }

  async collateralError(
    tx: Tx,
    draft: DraftRow,
    input: CollateralSectionInput,
    today: string,
  ): Promise<DomainError | null> {
    return collateralSectionError(input, {
      currentYear: Number(today.slice(0, 4)),
      collateralTypes: await this.collateralTypes(tx, draft),
    });
  }

  /** Jenis agunan yang boleh dipilih untuk produk draft (AC-46.02, AC-46.03). */
  async collateralTypes(tx: Tx, draft: DraftRow): Promise<CollateralType[]> {
    const configured = await this.parameters.choices(tx, "COLLATERAL_TYPES", draft.productId);
    return allowedCollateralTypes(draft.productCategory, configured);
  }
}
