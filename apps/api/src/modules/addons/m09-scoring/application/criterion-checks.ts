import type { CriterionInput } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import { formulaVariableOf } from "../../../core/calculation/index.js";
import { Licensing } from "../../../core/tenancy/index.js";
import type { Criterion } from "../domain/criteria.js";
import { checkedCriterion } from "../domain/criterion-rules.js";
import { variableOf } from "../domain/scoring-variables.js";

/**
 * Kriteria draft diperiksa terhadap katalog variabel yang boleh dipakai scoring dan berlisensi (api-specs 09 §9.2),
 * dan kode pilihan General Parameter aktif untuk variabel CHOICE.
 */
@Injectable()
export class CriterionChecks {
  constructor(
    private readonly licensing: Licensing,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
  ) {}

  async checked(tx: Tx, input: CriterionInput): Promise<Omit<Criterion, "id">> {
    const licensed = (await this.licensing.state(tx)).modules;
    const usable = (code: string) => {
      const variable = formulaVariableOf(code);
      return variable?.usableInScoring && licensed.has(variable.moduleCode) ? variableOf(code) : null;
    };
    const paramType = usable(input.fieldCode)?.paramType;
    const options = paramType ? await this.parameters.options(tx, paramType) : [];
    const allowed = new Set(options.map((option) => option.paramId));
    return checkedCriterion(input, usable, () => allowed);
  }
}
