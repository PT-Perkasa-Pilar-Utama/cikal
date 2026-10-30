import type { FormSection } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { SYSTEM_PARAMETER_PORT, type SystemParameterPort } from "../../../../platform/http/system-parameter-port.js";
import { ApplicationOccupationsRepository } from "../db/application-occupations.repository.js";
import { ApplicationPersonalsRepository } from "../db/application-personals.repository.js";
import type { DraftRow } from "../db/applications.repository.js";
import { formSteps } from "../domain/form-steps.js";

/**
 * `steps[]` pengajuan dari kategori produk, marital Personal, dan pekerjaan Occupation tersimpan, dibaca ulang
 * setiap simpan section (api-specs 12 §12.1, AC-50.06).
 */
@Injectable()
export class DraftSteps {
  constructor(
    private readonly personals: ApplicationPersonalsRepository,
    private readonly occupations: ApplicationOccupationsRepository,
    @Inject(SYSTEM_PARAMETER_PORT) private readonly parameters: SystemParameterPort,
  ) {}

  async of(tx: Tx, draft: Pick<DraftRow, "id" | "productCategory">): Promise<FormSection[]> {
    const personal = await this.personals.findByApplication(tx, draft.id);
    const occupation = await this.occupations.findByApplication(tx, draft.id);
    return formSteps({
      productCategory: draft.productCategory,
      married: await this.married(tx, personal?.marital ?? null),
      selfEmployed: await this.selfEmployed(tx, occupation?.occupation ?? null),
    });
  }

  /** Marital termasuk parameter `MARRIED_MARITAL_STATUSES` (US-43). */
  async married(tx: Tx, marital: string | null): Promise<boolean> {
    return marital !== null && (await this.parameters.choices(tx, "MARRIED_MARITAL_STATUSES")).includes(marital);
  }

  /** Occupation termasuk parameter `SELF_EMPLOYED_OCCUPATIONS` (US-45). */
  private async selfEmployed(tx: Tx, occupation: string | null): Promise<boolean> {
    return occupation !== null && (await this.parameters.choices(tx, "SELF_EMPLOYED_OCCUPATIONS")).includes(occupation);
  }
}
