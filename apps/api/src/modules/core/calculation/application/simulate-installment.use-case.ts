import type { InstallmentSimulationRequest, InstallmentSimulationResponse } from "@cikal/contracts";
import { addMonths, isoDate } from "@cikal/formula";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { CalculationApi } from "./calculation-api.js";

const MONEY_SCALE = 2;
const PERCENT_SCALE = 4;

const utcDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const money = (value: Decimal): string => value.toFixed(MONEY_SCALE);

/**
 * Simulasi angsuran Sales (api-specs 09 §9.1, US-51). Tidak menyimpan data selain log eksekusi rumus (FM-08).
 * Floating, Hybrid, dan Capped diterima kontrak tetapi baris MRTM-nya [Deferred] (AC-51.02), jadi dijawab
 * `501 NOT_IMPLEMENTED`.
 */
@Injectable()
export class SimulateInstallmentUseCase {
  constructor(private readonly calculation: CalculationApi) {}

  async execute(ctx: RequestContext, body: InstallmentSimulationRequest): Promise<InstallmentSimulationResponse> {
    const { interestType } = body;
    if (interestType !== "FLAT" && interestType !== "EFFECTIVE") throw DomainError.standard("NOT_IMPLEMENTED");
    const firstInstallmentDate = body.firstInstallmentDate
      ? utcDate(body.firstInstallmentDate)
      : addMonths(utcDate(businessDate(new Date())), 1, "LAST_DAY");
    const interestRate = new Decimal(body.interestRate);
    const result = await this.calculation.schedule(
      { tenantId: ctx.tenantId, productId: body.productId },
      { interestType, principal: new Decimal(body.principal), tenor: body.tenor, interestRate, firstInstallmentDate },
    );
    return {
      data: {
        interestType,
        principal: body.principal,
        tenor: body.tenor,
        appliedRate: interestRate.toFixed(PERCENT_SCALE),
        monthlyInstallment: money(result.monthlyInstallment),
        totalInterest: money(result.totalInterest),
        totalPayment: money(result.totalPayment),
        schedule: result.rows.map((row) => ({
          installmentNo: row.installmentNo,
          dueDate: isoDate(row.dueDate),
          principalAmount: money(row.principalAmount),
          interestAmount: money(row.interestAmount),
          installmentAmount: money(row.installmentAmount),
          outstandingAmount: money(row.outstandingAmount),
        })),
        formulaVersions: result.formulaVersions,
      },
    };
  }
}
