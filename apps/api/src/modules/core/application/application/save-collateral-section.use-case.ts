import type { CollateralSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationCollateralsRepository } from "../db/application-collaterals.repository.js";
import { addressColumns } from "../domain/address-fields.js";
import { DraftSections } from "./draft-sections.js";
import { StrictSections } from "./strict-sections.js";

/**
 * Simpan section Collateral produk kategori `COLLATERAL` dan `PENSION` (api-specs 12 §12.3; AC-46.01 s.d.
 * AC-46.06). Nomor sertifikat disimpan terenkripsi.
 */
@Injectable()
export class SaveCollateralSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly collaterals: ApplicationCollateralsRepository,
    private readonly rules: StrictSections,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(
    ctx: RequestContext,
    id: string,
    input: CollateralSectionInput,
    strict: boolean,
  ): Promise<SectionSaveResponse> {
    const today = businessDate(new Date());
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lockInSteps(tx, ctx, id, "collateral");
      const error = strict ? await this.rules.collateralError(tx, draft, input, today) : null;
      if (error) throw error;
      const certificateNumber = input.certificateNumber
        ? await this.encryption.encrypt(tx, input.certificateNumber)
        : null;
      await this.collaterals.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        {
          collateralType: input.collateralType ?? null,
          vehicleType: input.vehicleType ?? null,
          vehicleBrand: input.vehicleBrand ?? null,
          vehicleModel: input.vehicleModel ?? null,
          description: input.description ?? null,
          vehicleYear: input.vehicleYear ?? null,
          vehiclePrice: input.vehiclePrice ?? null,
          vehicleColor: input.vehicleColor ?? null,
          machineNumber: input.machineNumber ?? null,
          frameNumber: input.frameNumber ?? null,
          bpkbNumber: input.bpkbNumber ?? null,
          bpkbOwnerOccupation: input.bpkbOwnerOccupation ?? null,
          policeNumber: input.policeNumber ?? null,
          certificateType: input.certificateType ?? null,
          certificateNumberEnc: certificateNumber?.ciphertext ?? null,
          certificateNumberKeyVersion: certificateNumber?.keyVersion ?? null,
          surfaceArea: input.surfaceArea ?? null,
          decreeNumber: input.decreeNumber ?? null,
          decreeDate: input.decreeDate ?? null,
          ...addressColumns(input.address),
        },
        ctx.userId,
      );
      return this.sections.saved(tx, ctx, draft, "collateral", strict);
    });
  }
}
