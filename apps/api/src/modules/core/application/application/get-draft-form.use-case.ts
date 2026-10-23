import type { ApplicationFormResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import { ApplicationsRepository } from "../db/applications.repository.js";
import { formSteps } from "../domain/form-steps.js";

/**
 * Melanjutkan draft dari step terakhir (api-specs 12 §12.5, AC-49.05). Hanya pembuat draft yang bisa membuka; NIK
 * dikembalikan utuh hanya kepadanya (AC-49.06).
 */
@Injectable()
export class GetDraftFormUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly applications: ApplicationsRepository,
    private readonly personals: ApplicationPersonalsRepository,
    private readonly encryption: TenantEncryption,
  ) {}

  execute(ctx: RequestContext, id: string): Promise<ApplicationFormResponse> {
    return this.db.withTenantTx(ctx, async (tx) => {
      const draft = await this.applications.findOwned(tx, id, ctx.userId);
      const personal = draft && (await this.personals.findByApplication(tx, draft.id));
      if (!draft || !personal) throw DomainError.standard("NOT_FOUND");
      const idCardNumber = await this.encryption.decrypt(tx, {
        ciphertext: personal.idCardNumberEnc,
        keyVersion: personal.idCardNumberKeyVersion,
      });
      return {
        data: {
          id: draft.id,
          loanId: draft.loanId,
          status: draft.status,
          currentSection: draft.currentSection,
          steps: formSteps(),
          sections: {
            application: {
              applicationType: draft.applicationType,
              productCategory: draft.productCategory,
              productId: draft.productId,
              segment: draft.segment,
              purposeOfLoan: draft.purposeOfLoan,
              tenorProposed: draft.tenorProposed,
              requestedLimit: draft.requestedLimit,
              insuranceId: draft.insuranceId,
            },
            personal: {
              idType: personal.idType,
              idCardNumber,
              fullName: personal.fullName,
              fullNameId: personal.fullNameId,
            },
            occupation: null,
            "emergency-contact": null,
          },
          documentCompleteness: null,
          returnNote: draft.returnNote,
        },
      };
    });
  }
}
