import {
  type IpCheckStatus,
  retryableAdapterCategories,
  type StepContext,
  type StepResult,
  type VelocityHit,
} from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import { TenantEncryption } from "../../../../platform/crypto/tenant-encryption.js";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import {
  type ApplicantIdentity,
  type ApplicationFacts,
  ApplicationFactsReader,
  ApplicationIdentities,
  type SubmissionKey,
} from "../../../core/application/index.js";
import { IntegrationApi } from "../../../core/integration/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { FraudRepository } from "../db/fraud.repository.js";
import { MANUAL_REVIEW_UNAVAILABLE } from "../domain/fraud-errors.js";
import { type FraudVerdict, ipStatusOf, judgeFraud, velocityHit, windowStart } from "../domain/fraud-rules.js";
import { ipReputationPort } from "../ports/ip-reputation.port.js";

const OUTCOME_LABELS = { CLEAN: "Clean", SUSPICIOUS: "Suspicious", HIGH_FRAUD_POTENTIAL: "High Fraud Potential" };

interface IpCheck {
  status: IpCheckStatus;
  category: string | null;
  providerCode: string | null;
}

const NOT_CHECKED: IpCheck = { status: "NOT_APPLICABLE", category: null, providerCode: null };

/** Kunci pengajuan per dimensi aturan; `DEVICE_ID` dan IP kosong tidak punya data sehingga tidak dihitung. */
function submissionKey(
  dimension: VelocityHit["dimension"],
  applicant: ApplicantIdentity,
  facts: ApplicationFacts,
): SubmissionKey | null {
  if (dimension === "FULL_NAME") return { dimension, fullNameId: applicant.fullNameId };
  if (dimension === "ID_CARD_NUMBER") return { dimension, nikBlindIndex: applicant.nikBlindIndex };
  if (dimension === "IP_ADDRESS" && facts.clientIpAddress) return { dimension, clientIpAddress: facts.clientIpAddress };
  return null;
}

/** Clean lanjut; High Fraud Potential mengakhiri pengajuan; Suspicious menunggu layar US-66, di POC ERROR. */
function stepResultOf(verdict: FraudVerdict): StepResult {
  const summary = `Fraud = ${OUTCOME_LABELS[verdict.outcome]}`;
  if (verdict.outcome === "CLEAN") return { type: "CONTINUE", outcomeCode: verdict.outcome, summary };
  if (verdict.outcome === "SUSPICIOUS") {
    return {
      type: "ERROR",
      errorCategory: "BUSINESS_SETUP",
      errorMessage: MANUAL_REVIEW_UNAVAILABLE,
      retryable: false,
    };
  }
  return { type: "FINISH", outcomeCode: verdict.outcome, applicationStatus: "FINISHED_REJECTED", summary };
}

/**
 * StepHandler `FRAUD` M08 (technical-specs 05 §5.18, api-specs 21 §21.1): blacklist, FraudVelocityRule, lalu
 * reputasi IP lewat IpReputationPort dan Fraud Matrix. Pengajuan tanpa IP (Upload) dinilai dari blacklist dan
 * frekuensi saja (AC-65.02). IP tidak diperiksa bila blacklist atau frekuensi sudah menentukan hasilnya.
 */
@Injectable()
export class FraudStepHandler implements StepHandler {
  readonly stepCode = "FRAUD";
  readonly moduleCode = "M08";

  constructor(
    private readonly identities: ApplicationIdentities,
    private readonly facts: ApplicationFactsReader,
    private readonly fraud: FraudRepository,
    private readonly integration: IntegrationApi,
    private readonly encryption: TenantEncryption,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const applicant = await this.identities.identityOf(tx, ctx.applicationId);
    const facts = await this.facts.of(tx, ctx.applicationId);
    if (!applicant || !facts) {
      return {
        type: "ERROR",
        errorCategory: "CONFIG",
        errorMessage: "Applicant personal data is not available",
        retryable: false,
      };
    }
    const ipAddress = facts.clientIpAddress;
    const isBlacklisted = await this.fraud.isBlacklisted(tx, applicant.nikBlindIndex);
    const rules = await this.fraud.activeRules(tx);
    const hits = await this.velocityHits(tx, rules, applicant, facts);
    const matrix = await this.fraud.matrix(tx);
    const decided = judgeFraud({ isBlacklisted, rules, hits, ipStatus: "NOT_APPLICABLE", matrix });
    let ipCheck = NOT_CHECKED;
    if (decided.outcome !== "HIGH_FRAUD_POTENTIAL" && ipAddress) {
      const answer = await this.integration.invoke(
        ipReputationPort,
        { ipAddress },
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
      ipCheck = {
        status: ipStatusOf(answer.response, facts.idProvinceCode),
        category: answer.response.isVpnOrProxy ? "VPN_PROXY" : "NORMAL",
        providerCode: answer.providerCode,
      };
    }
    const verdict =
      decided.outcome === "HIGH_FRAUD_POTENTIAL"
        ? decided
        : judgeFraud({ isBlacklisted, rules, hits, ipStatus: ipCheck.status, matrix });
    await this.save(tx, ctx, { verdict, isBlacklisted, ipCheck, ipAddress, hits });
    if (verdict.blacklistReason) await this.blacklist(tx, ctx, applicant, verdict.blacklistReason);
    return stepResultOf(verdict);
  }

  private async velocityHits(
    tx: Tx,
    rules: Awaited<ReturnType<FraudRepository["activeRules"]>>,
    applicant: ApplicantIdentity,
    facts: ApplicationFacts,
  ): Promise<VelocityHit[]> {
    const now = new Date();
    const hits: VelocityHit[] = [];
    for (const rule of rules) {
      const key = submissionKey(rule.dimension, applicant, facts);
      if (!key) continue;
      hits.push(velocityHit(rule, await this.facts.countSubmitted(tx, key, windowStart(rule, now))));
    }
    return hits;
  }

  private save(
    tx: Tx,
    ctx: StepContext,
    result: {
      verdict: FraudVerdict;
      isBlacklisted: boolean;
      ipCheck: IpCheck;
      ipAddress: string | null;
      hits: VelocityHit[];
    },
  ): Promise<void> {
    return this.fraud.replace(tx, {
      id: uuidv7(),
      tenantId: ctx.tenantId,
      applicationId: ctx.applicationId,
      processInstanceId: ctx.processInstanceId,
      outcome: result.verdict.outcome,
      isBlacklisted: result.isBlacklisted,
      ipStatus: result.ipCheck.status,
      ipCategory: result.ipCheck.category,
      ipAddress: result.ipAddress,
      ipProviderCode: result.ipCheck.providerCode,
      velocityHits: result.hits,
      matrixRowId: result.verdict.matrixRow?.id ?? null,
      matrixRowPriority: result.verdict.matrixRow?.priority ?? null,
    });
  }

  /** Data pemohon masuk blacklist saat frekuensi terlampaui (TRM_FRD_002). */
  private async blacklist(tx: Tx, ctx: StepContext, applicant: ApplicantIdentity, reason: string): Promise<void> {
    const nik = await this.encryption.encrypt(tx, applicant.nik);
    await this.fraud.addToBlacklist(tx, {
      id: uuidv7(),
      tenantId: ctx.tenantId,
      fullName: applicant.fullNameId,
      idCardNumberEnc: nik.ciphertext,
      idCardNumberKeyVersion: nik.keyVersion,
      idCardNumberBidx: applicant.nikBlindIndex,
      reason,
      sourceApplicationId: ctx.applicationId,
    });
  }
}
