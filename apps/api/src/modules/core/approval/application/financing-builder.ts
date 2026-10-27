import type { ApprovalType } from "@cikal/contracts";
import { addMonths, isoDate } from "@cikal/formula";
import { Injectable } from "@nestjs/common";
import { Decimal } from "decimal.js";
import { v7 as uuidv7 } from "uuid";
import { businessDate } from "../../../../platform/clock/business-date.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { ApplicationFactsReader, ApplicationProcess } from "../../application/index.js";
import { CalculationApi, type CalculationContext, DEFAULT_FORMULA_VERSION } from "../../calculation/index.js";
import { FinancingsRepository } from "../db/financings.repository.js";
import type { ApprovedTermValues } from "../domain/approved-terms.js";

/** Proses yang disetujui beserta snapshot parameternya (PR-06). */
export interface ApprovedProcess {
  tenantId: string;
  applicationId: string;
  processInstanceId: string;
  parameterSnapshot: Readonly<Record<string, string>>;
}

/** Struktur kredit yang disetujui; nilai approver menggantikan usulan pengajuan dan suku bunga produk (AC-97.06). */
export interface ApprovedTerms extends ApprovedTermValues {
  approvalType: ApprovalType;
}

const MONEY_SCALE = 2;
const PERCENT_SCALE = 4;
const FEE_FORMULAS = ["ADMIN_FEE_AMOUNT", "PROVISION_FEE_AMOUNT", "NET_DISBURSEMENT", "DBR_RATIO"] as const;

const money = (value: Decimal): string => value.toFixed(MONEY_SCALE);
const percent = (value: Decimal): string => value.toFixed(PERCENT_SCALE);
const isScheduled = (value: string | undefined): value is "FLAT" | "EFFECTIVE" =>
  value === "FLAT" || value === "EFFECTIVE";

function formulaError(message: string): DomainError {
  return new DomainError("FORMULA_ERROR", message, 422);
}

function decimalOf(value: unknown, code: string): Decimal {
  if (value instanceof Decimal) return value;
  throw formulaError(`Formula ${code} must return a number`);
}

/**
 * `buildFinancing(appId)` technical-specs 05 §5.14: rumus RM-07 (biaya dan pencairan bersih), angsuran per jenis
 * bunga, jadwal dengan sisa pokok baris terakhir 0 (RM-19), dan DBR RM-08. Asuransi 0 sampai e-polis menghitung ulang.
 * Error rumus dilempar `FORMULA_ERROR` tanpa nilai pengganti (FM-09).
 */
@Injectable()
export class FinancingBuilder {
  constructor(
    private readonly facts: ApplicationFactsReader,
    private readonly applications: ApplicationProcess,
    private readonly calculation: CalculationApi,
    private readonly financings: FinancingsRepository,
  ) {}

  async build(tx: Tx, process: ApprovedProcess, terms: ApprovedTerms, actorId: string | null): Promise<void> {
    const facts = await this.facts.of(tx, process.applicationId);
    if (!facts?.requestedLimit || !facts.tenorProposed) throw formulaError("Requested limit and tenor are required");
    const snapshot = process.parameterSnapshot;
    const interestType = snapshot.PRODUCT_INTEREST_TYPE;
    if (!isScheduled(interestType)) {
      throw formulaError(`Interest type ${interestType ?? "-"} has no installment formula in the POC`);
    }
    const productRate = snapshot.PRODUCT_INTEREST_RATE;
    const rateValue = terms.interestRate ?? (productRate ? new Decimal(productRate) : null);
    if (!rateValue) throw formulaError("The product has no interest rate on the submission date");
    const ctx: CalculationContext = {
      tenantId: process.tenantId,
      productId: facts.productId,
      applicationId: process.applicationId,
      processInstanceId: process.processInstanceId,
    };
    const loanAmount = terms.loanAmount ?? new Decimal(facts.requestedLimit);
    const tenor = terms.tenor ?? facts.tenorProposed;
    const firstInstallmentDate = addMonths(new Date(`${businessDate(new Date())}T00:00:00Z`), 1, "LAST_DAY");
    const schedule = await this.calculation.schedule(ctx, {
      interestType,
      principal: loanAmount,
      tenor,
      interestRate: rateValue,
      firstInstallmentDate,
    });
    const fees = {
      loanAmount,
      adminFee: new Decimal(snapshot.PRODUCT_ADMIN_FEE ?? 0),
      provisionFee: new Decimal(snapshot.PRODUCT_PROVISION_FEE ?? 0),
      insuranceValue: new Decimal(0),
    };
    const evaluate = async (code: (typeof FEE_FORMULAS)[number], variables: Record<string, Decimal>) =>
      decimalOf(await this.calculation.evaluate(ctx, code, variables), code);
    const adminFee = await evaluate("ADMIN_FEE_AMOUNT", fees);
    const provisionFee = await evaluate("PROVISION_FEE_AMOUNT", fees);
    const netDisbursement = await evaluate("NET_DISBURSEMENT", fees);
    const income = facts.monthlyIncomeAllowance;
    const dbrRatio = income
      ? await evaluate("DBR_RATIO", {
          monthlyInstallment: schedule.monthlyInstallment,
          monthlyIncomeAllowance: new Decimal(income),
        })
      : null;
    const usedFormulas = income ? FEE_FORMULAS : FEE_FORMULAS.filter((code) => code !== "DBR_RATIO");
    await this.financings.replace(
      tx,
      process.tenantId,
      {
        id: uuidv7(),
        applicationId: process.applicationId,
        processInstanceId: process.processInstanceId,
        approvalType: terms.approvalType,
        loanAmount: money(loanAmount),
        tenor,
        interestType,
        interestRate: percent(rateValue),
        floatingRate: snapshot.PRODUCT_FLOATING_RATE ?? null,
        capRate: snapshot.PRODUCT_CAP_RATE ?? null,
        tenorFixed: snapshot.PRODUCT_TENOR_FIXED ? Number(snapshot.PRODUCT_TENOR_FIXED) : null,
        adminFee: money(adminFee),
        salesFee: snapshot.PRODUCT_SALES_FEE ?? null,
        provisionFee: money(provisionFee),
        insuranceValue: money(fees.insuranceValue),
        netDisbursement: money(netDisbursement),
        monthlyInstallment: money(schedule.monthlyInstallment),
        dbrRatio: dbrRatio && percent(dbrRatio),
        dsrRatio: null,
        formulaVersions: {
          ...schedule.formulaVersions,
          ...Object.fromEntries(usedFormulas.map((code) => [code, DEFAULT_FORMULA_VERSION])),
        },
        firstInstallmentDate: isoDate(firstInstallmentDate),
      },
      schedule.rows.map((row) => ({
        installmentNo: row.installmentNo,
        dueDate: isoDate(row.dueDate),
        principalAmount: money(row.principalAmount),
        interestAmount: money(row.interestAmount),
        outstandingAmount: money(row.outstandingAmount),
      })),
      actorId,
    );
    await this.applications.recordApprovedTerms(
      tx,
      process.applicationId,
      { tenorApproved: tenor, loanAmount: money(loanAmount) },
      actorId,
    );
  }
}
