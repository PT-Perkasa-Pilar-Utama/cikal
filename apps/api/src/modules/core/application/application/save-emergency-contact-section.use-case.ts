import type { EmergencyContactSectionInput, SectionSaveResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { ApplicationEmergencyContactsRepository } from "../db/application-emergency-contacts.repository.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import { addressColumns } from "../domain/address-fields.js";
import { emergencyContactSectionError } from "../domain/emergency-contact-section-rules.js";
import { DraftSections } from "./draft-sections.js";

/** Simpan section Emergency Contact (api-specs 12 §12.3; AC-48.01 s.d. AC-48.04). */
@Injectable()
export class SaveEmergencyContactSectionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sections: DraftSections,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly contacts: ApplicationEmergencyContactsRepository,
  ) {}

  execute(
    ctx: RequestContext,
    id: string,
    input: EmergencyContactSectionInput,
    strict: boolean,
  ): Promise<SectionSaveResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.sections.lock(tx, ctx, id);
      if (strict) {
        const personal = await this.personals.findByApplication(tx, draft.id);
        const error = emergencyContactSectionError(input, personal?.mobileNumber ?? null);
        if (error) throw error;
      }
      await this.contacts.upsert(
        tx,
        { applicationId: draft.id, tenantId: ctx.tenantId },
        {
          contactName: input.contactName ?? null,
          relationToApplicant: input.relationToApplicant ?? null,
          mobileNumber: input.mobileNumber ?? null,
          homePhoneNumber: input.homePhoneNumber ?? null,
          altPhoneNumber: input.altPhoneNumber ?? null,
          ...addressColumns(input.address),
        },
        ctx.userId,
      );
      return this.sections.saved(tx, ctx, draft, "emergency-contact", strict);
    });
  }
}
