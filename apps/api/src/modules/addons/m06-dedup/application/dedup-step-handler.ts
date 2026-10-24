import type { StepContext, StepResult } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { v7 as uuidv7 } from "uuid";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ApplicationIdentities } from "../../../core/application/index.js";
import type { StepHandler } from "../../../core/orchestrator/index.js";
import { DedupConfigRepository } from "../db/dedup-config.repository.js";
import { DedupResultsRepository } from "../db/dedup-results.repository.js";
import { MANUAL_REVIEW_UNAVAILABLE } from "../domain/dedup-errors.js";
import { evaluateDedup } from "../domain/dedup-rules.js";
import type { DedupEvaluation } from "../domain/dedup-types.js";

const OUTCOME_LABELS = { MATCH: "Match", UNMATCH: "UnMatch", SKIP: "Skip" } as const;

const failure = (errorCategory: "CONFIG" | "BUSINESS_SETUP", errorMessage: string): StepResult => ({
  type: "ERROR",
  errorCategory,
  errorMessage,
  retryable: false,
});

/** Match, UnMatch, dan Skip lanjut; Review dan Duplicate In-Flight menunggu layar review US-60, di POC ERROR. */
function stepResultOf(evaluation: DedupEvaluation): StepResult {
  const { outcome } = evaluation;
  if (outcome === "REVIEW" || outcome === "DUPLICATE_IN_FLIGHT") {
    return failure("BUSINESS_SETUP", MANUAL_REVIEW_UNAVAILABLE);
  }
  return { type: "CONTINUE", outcomeCode: outcome, summary: `Dedup = ${OUTCOME_LABELS[outcome]}` };
}

/**
 * StepHandler `DEDUP` M06 (technical-specs 05 §5.18, api-specs 19 §19.1): kandidat dari blind index NIK dan tanggal
 * lahir lewat Application, skor fuzzy per `DedupFieldSetting`, lalu Dedup Matrix. Hasil disimpan sebelum StepResult
 * dikembalikan, jadi hasil Review tetap bisa dilihat di `GET /applications/{id}/dedup`.
 */
@Injectable()
export class DedupStepHandler implements StepHandler {
  readonly stepCode = "DEDUP";
  readonly moduleCode = "M06";

  constructor(
    private readonly identities: ApplicationIdentities,
    private readonly config: DedupConfigRepository,
    private readonly results: DedupResultsRepository,
  ) {}

  async execute(tx: Tx, ctx: StepContext): Promise<StepResult> {
    const subject = await this.identities.identityOf(tx, ctx.applicationId);
    if (!subject) return failure("CONFIG", "Applicant personal data is not available");
    const settings = await this.config.fieldSettings(tx);
    if (!settings) return failure("BUSINESS_SETUP", "Dedup field settings are not configured");
    const candidates = subject.nik.trim() === "" ? [] : await this.identities.dedupCandidates(tx, subject);
    const evaluation = evaluateDedup(subject, candidates, await this.config.matrix(tx), settings);
    await this.results.replace(
      tx,
      ctx.tenantId,
      {
        id: uuidv7(),
        applicationId: ctx.applicationId,
        processInstanceId: ctx.processInstanceId,
        outcome: evaluation.outcome,
        matchedApplicationId: evaluation.matched?.candidate.applicationId ?? null,
        matrixRowId: evaluation.matrixRow?.id ?? null,
        matrixRowPriority: evaluation.matrixRow?.priority ?? null,
      },
      evaluation.comparisons.map((comparison) => ({
        id: uuidv7(),
        candidateApplicationId: comparison.candidate.applicationId,
        candidateLoanId: comparison.candidate.loanId,
        candidateStatus: comparison.candidate.status,
        nikResult: comparison.nikResult,
        dobResult: comparison.dobResult,
        pobResult: comparison.pobResult,
        nameScore: comparison.nameScore,
        motherNameScore: comparison.motherNameScore,
      })),
    );
    return stepResultOf(evaluation);
  }
}
