import type { InterestType } from "@cikal/formula";
import { Inject, Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { GENERAL_PARAMETER_PORT, type GeneralParameterPort } from "../../../../platform/http/general-parameter-port.js";
import type { ApplicationFacts } from "../../../core/application/index.js";
import { CalculationApi } from "../../../core/calculation/index.js";
import { ageOn } from "../domain/age.js";
import type { ChoiceLabel, VariableValues } from "../domain/criteria.js";
import { variableOf } from "../domain/scoring-variables.js";

const RATIO = "INSTALLMENT_TO_INCOME_RATIO";

/**
 * Konteks penilaian: langkah proses, atau uji model tanpa proses (api-specs 22 §22.5) yang tidak mengisi
 * `applicationId` dan `processInstanceId` sehingga log rumus tidak tercatat atas pengajuan contoh.
 */
export interface ValueContext {
  tenantId: string;
  applicationId?: string;
  processInstanceId?: string;
  parameterSnapshot: Readonly<Record<string, string>>;
}
const RATIO_DECIMALS = 4;
const isInterestType = (value: string | undefined): value is InterestType => value === "FLAT" || value === "EFFECTIVE";

/**
 * Nilai variabel kriteria satu pengajuan (api-specs 09 §9.2). Data pengajuan dari Application, nilai produk dari
 * snapshot ProcessInstance saat submit (AC-20.08), dan rasio angsuran lewat rumus `DBR_RATIO` Calculation (RM-08).
 */
@Injectable()
export class VariableValuesResolver {
  constructor(
    private readonly calculation: CalculationApi,
    @Inject(GENERAL_PARAMETER_PORT) private readonly parameters: GeneralParameterPort,
  ) {}

  async values(ctx: ValueContext, facts: ApplicationFacts, codes: ReadonlySet<string>): Promise<VariableValues> {
    const snapshot = ctx.parameterSnapshot;
    return {
      OCCUPATION: facts.occupation,
      MARITAL: facts.marital,
      EDUCATION: facts.education,
      MONTHLY_INCOME: facts.monthlyIncomeAllowance,
      TENURE_AT_CURRENT_JOB: facts.tenureAtCurrentJob,
      AGE: facts.dateOfBirth === null ? null : String(ageOn(facts.dateOfBirth, businessDate(new Date()))),
      REQUESTED_LIMIT: facts.requestedLimit,
      TENOR: facts.tenorProposed === null ? null : String(facts.tenorProposed),
      PRODUCT_DBR_MAX: snapshot.PRODUCT_DBR_MAX ?? null,
      [RATIO]: codes.has(RATIO) ? await this.installmentRatio(ctx, facts) : null,
    };
  }

  /** Label kode pilihan untuk variabel CHOICE yang dipakai kriteria; kode tanpa label tampil apa adanya. */
  async choiceLabels(tx: Tx, codes: ReadonlySet<string>): Promise<ChoiceLabel> {
    const labels = new Map<string, Map<string, string>>();
    for (const code of codes) {
      const { paramType } = variableOf(code);
      if (!paramType) continue;
      const options = await this.parameters.options(tx, paramType, { includeInactive: true });
      labels.set(code, new Map(options.map((option) => [option.paramId, option.paramValue])));
    }
    return (fieldCode, value) => labels.get(fieldCode)?.get(value) ?? value;
  }

  /** Angsuran dari plafon, tenor, dan suku bunga produk dibagi penghasilan, dalam persen (AC-67.02). */
  private async installmentRatio(ctx: ValueContext, facts: ApplicationFacts): Promise<string | null> {
    const { PRODUCT_INTEREST_RATE: rate, PRODUCT_INTEREST_TYPE: interestType } = ctx.parameterSnapshot;
    const { requestedLimit, tenorProposed, monthlyIncomeAllowance } = facts;
    if (!requestedLimit || !tenorProposed || !monthlyIncomeAllowance || !rate || !isInterestType(interestType)) {
      return null;
    }
    const calculationContext = {
      tenantId: ctx.tenantId,
      applicationId: ctx.applicationId,
      processInstanceId: ctx.processInstanceId,
    };
    const { monthlyInstallment } = await this.calculation.schedule(calculationContext, {
      interestType,
      principal: new Decimal(requestedLimit),
      tenor: tenorProposed,
      interestRate: new Decimal(rate),
      firstInstallmentDate: new Date(),
    });
    const ratio = await this.calculation.evaluate(calculationContext, "DBR_RATIO", {
      monthlyInstallment,
      monthlyIncomeAllowance: new Decimal(monthlyIncomeAllowance),
    });
    return ratio instanceof Decimal ? ratio.toFixed(RATIO_DECIMALS) : null;
  }
}
