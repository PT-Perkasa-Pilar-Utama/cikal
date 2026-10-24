import { DECISION_MATRIX_MESSAGES, MATRIX_COLUMNS, type ModuleOutcomes } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** `409 MATRIX_ROW_EXISTS` (api-specs 24 §24.2). */
export function matrixRowExists(): DomainError {
  return new DomainError("MATRIX_ROW_EXISTS", DECISION_MATRIX_MESSAGES.rowExists, 409);
}

/** Hasil keenam modul wajib dipilih; kolom kosong dijawab `422 OUTCOME_REQUIRED` (AC-36.04). */
export function requireAllOutcomes(input: Partial<ModuleOutcomes>): ModuleOutcomes {
  const { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome } = input;
  if (dedupOutcome && dukcapilOutcome && fraudOutcome && racOutcome && scoringOutcome && creditBureauOutcome) {
    return { dedupOutcome, dukcapilOutcome, fraudOutcome, racOutcome, scoringOutcome, creditBureauOutcome };
  }
  const missing = MATRIX_COLUMNS.filter((column) => !input[column]);
  const message = DECISION_MATRIX_MESSAGES.outcomeRequired;
  throw new DomainError(
    "OUTCOME_REQUIRED",
    message,
    422,
    missing.map((field) => ({ field, code: "OUTCOME_REQUIRED", message })),
  );
}

/** `404 APPLICATION_NOT_FOUND` (api-specs 24 §24.4). */
export function applicationNotFound(): DomainError {
  return new DomainError("APPLICATION_NOT_FOUND", "Application not found", 404);
}
