import { retryableAdapterCategories, type StepContext, type StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationFactsReader, ApplicationIdentities } from "../../../core/application/index.js";
import { IntegrationApi } from "../../../core/integration/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { CreditBureauRepository } from "../db/credit-bureau.repository.js";
import { aggregateCollectibility, collectibilityLabel } from "../domain/collectibility.js";
import { creditBureauPort } from "../ports/credit-bureau.port.js";

const MODULE_CODE = "M10";

const failure = (
  errorCategory: "CONFIG" | "BUSINESS_SETUP" | "INVALID_RESPONSE",
  errorMessage: string,
): StepResult => ({ type: "ERROR", errorCategory, errorMessage, retryable: false });

/**
 * StepHandler `CREDIT_BUREAU` M10 (technical-specs 05 §5.18, api-specs 23 §23.1): mode `SYNC` memanggil
 * CreditBureauPort lewat Integration Registry, mengagregasi kolektibilitas terburuk fasilitas aktif, lalu memetakan
 * hasilnya dengan CreditBureauOutcomeMapping. Mode `MANUAL` (tugas unggah iDeb) dan `ASYNC` belum ada di POC.
 */
@Injectable()
export class CreditBureauStepHandler implements StepHandler {
  readonly stepCode = "CREDIT_BUREAU";
  readonly moduleCode = MODULE_CODE;

  constructor(
    private readonly identities: ApplicationIdentities,
    private readonly facts: ApplicationFactsReader,
    private readonly creditBureau: CreditBureauRepository,
    private readonly integration: IntegrationApi,
    private readonly encryption: TenantEncryption,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const mode = await this.integration.activeMode(ctx.tenantId, MODULE_CODE);
    if (mode === "MANUAL" || mode === "ASYNC") {
      return failure("BUSINESS_SETUP", `Credit bureau mode ${mode} is not available in POC`);
    }
    const applicant = await this.identities.identityOf(tx, ctx.applicationId);
    const facts = await this.facts.of(tx, ctx.applicationId);
    if (!applicant?.dateOfBirth || !facts) return failure("CONFIG", "Applicant personal data is not available");
    const answer = await this.integration.invoke(
      creditBureauPort,
      {
        nik: applicant.nik,
        fullName: applicant.fullNameId,
        dateOfBirth: applicant.dateOfBirth,
        placeOfBirth: applicant.placeOfBirth ?? "",
        motherMaidenName: applicant.motherMaidenName ?? "",
        purposeCode: facts.purposeOfLoan ?? "",
      },
      {
        tenantId: ctx.tenantId,
        correlationId: ctx.correlationId,
        attempt: ctx.attempt,
        applicationId: ctx.applicationId,
        loanId: ctx.loanId,
      },
    );
    if (!answer.ok) {
      return {
        type: "ERROR",
        errorCategory: answer.category,
        errorMessage: answer.message,
        retryable: retryableAdapterCategories.has(answer.category),
      };
    }
    const report = answer.response;
    const aggregation = aggregateCollectibility(report.facilities);
    if (!aggregation.ok) return failure("INVALID_RESPONSE", aggregation.message);
    const mapping = (await this.creditBureau.mappings(tx)).find(
      (candidate) => candidate.collectibility === aggregation.collectibility,
    );
    if (!mapping) {
      const value = aggregation.collectibility ?? "no history";
      return failure("BUSINESS_SETUP", `No credit bureau outcome mapping for collectibility ${value}`);
    }
    const raw = await this.encryption.encrypt(tx, JSON.stringify(answer.raw));
    await this.creditBureau.replace(
      tx,
      {
        id: uuidv7(),
        tenantId: ctx.tenantId,
        applicationId: ctx.applicationId,
        processInstanceId: ctx.processInstanceId,
        providerCode: answer.providerCode,
        mode: "SYNC",
        reportReference: report.reportReference,
        reportDate: report.reportDate,
        hasHistory: report.hasHistory,
        aggregatedCollectibility: aggregation.collectibility,
        quality: mapping.quality,
        outcome: mapping.outcome,
        reportFileId: report.reportFileId ?? null,
        rawResponseEnc: raw.ciphertext,
        rawResponseKeyVersion: raw.keyVersion,
      },
      report.facilities.map((facility) => ({ id: uuidv7(), ...facility, lastUpdated: null })),
    );
    return { type: "CONTINUE", outcomeCode: mapping.outcome, summary: collectibilityLabel(mapping) };
  }
}
