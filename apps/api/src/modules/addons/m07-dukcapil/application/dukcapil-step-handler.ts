import {
  type DukcapilRuleSnapshot,
  retryableAdapterCategories,
  type StepContext,
  type StepResult,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type ApplicantIdentity, ApplicationIdentities } from "../../../core/application/index.js";
import { IntegrationApi, type InvokeOutcome } from "../../../core/integration/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { DukcapilRepository, type DukcapilResultInsert } from "../db/dukcapil.repository.js";
import { DUKCAPIL_TIMEOUT, MANUAL_REVIEW_UNAVAILABLE } from "../domain/dukcapil-errors.js";
import { type DukcapilRule, type DukcapilVerdict, judgeDukcapil } from "../domain/dukcapil-rules.js";
import { type DukcapilResponse, dukcapilPort } from "../ports/dukcapil.port.js";

const OUTCOME_LABELS = { PASSED: "Passed", REVIEW: "Review", FAILED: "Failed", SKIP: "Skip" } as const;

const failure = (errorCategory: "CONFIG" | "BUSINESS_SETUP", errorMessage: string): StepResult => ({
  type: "ERROR",
  errorCategory,
  errorMessage,
  retryable: false,
});

/** Gangguan penyedia: kategori sementara diretry orchestrator, timeout memakai pesan AC-61.02. */
function providerFailure(outcome: Extract<InvokeOutcome<DukcapilResponse>, { ok: false }>): StepResult {
  return {
    type: "ERROR",
    errorCategory: outcome.category,
    errorMessage: outcome.category === "TIMEOUT" ? DUKCAPIL_TIMEOUT : outcome.message,
    retryable: retryableAdapterCategories.has(outcome.category),
  };
}

/** Passed lanjut; Failed mengakhiri pengajuan dengan email penolakan; Review menunggu layar US-62, di POC ERROR. */
function stepResultOf(verdict: DukcapilVerdict): StepResult {
  const summary = `Dukcapil = ${OUTCOME_LABELS[verdict.outcome]}`;
  if (verdict.outcome === "PASSED") return { type: "CONTINUE", outcomeCode: verdict.outcome, summary };
  if (verdict.outcome === "REVIEW") return failure("BUSINESS_SETUP", MANUAL_REVIEW_UNAVAILABLE);
  return { type: "FINISH", outcomeCode: verdict.outcome, applicationStatus: "FINISHED_REJECTED", summary };
}

const snapshotOf = (rule: DukcapilRule): DukcapilRuleSnapshot => ({
  nameWeight: rule.nameWeight,
  motherNameWeight: rule.motherNameWeight,
  passedThreshold: rule.passedThreshold,
  reviewThreshold: rule.reviewThreshold,
});

/**
 * StepHandler `DUKCAPIL` M07 (technical-specs 05 §5.18, api-specs 20 §20.1): data pemohon dibandingkan dengan
 * DukcapilPort lewat Integration Registry, lalu dinilai DukcapilRule tenant. Tanggal lahir kosong = Skip tanpa
 * memanggil penyedia (TRM_DKC_008). Hasil disimpan sebelum StepResult dikembalikan.
 */
@Injectable()
export class DukcapilStepHandler implements StepHandler {
  readonly stepCode = "DUKCAPIL";
  readonly moduleCode = "M07";

  constructor(
    private readonly identities: ApplicationIdentities,
    private readonly dukcapil: DukcapilRepository,
    private readonly integration: IntegrationApi,
    private readonly encryption: TenantEncryption,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const applicant = await this.identities.identityOf(tx, ctx.applicationId);
    if (!applicant) return failure("CONFIG", "Applicant personal data is not available");
    const rule = await this.dukcapil.rule(tx);
    if (!rule) return failure("BUSINESS_SETUP", "Dukcapil rule is not configured");
    const base = this.resultBase(ctx, rule);
    if (!applicant.dateOfBirth) {
      await this.dukcapil.replace(tx, { ...base, outcome: "SKIP", recordFound: false });
      return { type: "CONTINUE", outcomeCode: "SKIP", summary: `Dukcapil = ${OUTCOME_LABELS.SKIP}` };
    }
    const answer = await this.integration.invoke(dukcapilPort, this.requestOf(applicant, applicant.dateOfBirth), {
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      attempt: ctx.attempt,
      applicationId: ctx.applicationId,
      loanId: ctx.loanId,
    });
    if (!answer.ok) return providerFailure(answer);
    const verdict = judgeDukcapil(rule, answer.response);
    const raw = await this.encryption.encrypt(tx, JSON.stringify(answer.raw));
    await this.dukcapil.replace(tx, {
      ...base,
      ...verdict,
      recordFound: answer.response.recordFound,
      providerCode: answer.providerCode,
      providerReference: answer.response.providerReference ?? null,
      fullNameScore: answer.response.recordFound ? answer.response.fullNameScore : null,
      motherNameScore: answer.response.recordFound ? answer.response.motherNameScore : null,
      rawResponseEnc: raw.ciphertext,
      rawResponseKeyVersion: raw.keyVersion,
    });
    return stepResultOf(verdict);
  }

  private resultBase(ctx: StepContext, rule: DukcapilRule): Omit<DukcapilResultInsert, "outcome" | "recordFound"> {
    return {
      id: uuidv7(),
      tenantId: ctx.tenantId,
      applicationId: ctx.applicationId,
      processInstanceId: ctx.processInstanceId,
      rule: snapshotOf(rule),
    };
  }

  /** Nama sesuai KTP (`fullNameId`) yang dibandingkan dengan data kependudukan. */
  private requestOf(applicant: ApplicantIdentity, dateOfBirth: string) {
    return {
      nik: applicant.nik,
      fullName: applicant.fullNameId,
      motherMaidenName: applicant.motherMaidenName ?? "",
      dateOfBirth,
      placeOfBirth: applicant.placeOfBirth ?? "",
    };
  }
}
