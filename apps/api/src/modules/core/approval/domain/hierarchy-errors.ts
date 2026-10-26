import { APPROVAL_HIERARCHY_MESSAGES } from "@cikal/contracts";
import { DomainError } from "../../../../platform/http/domain-error.js";

/** `422 APPROVER_WITHOUT_ACCESS` (AC-27.02). */
export function approverWithoutAccess(): DomainError {
  const message = APPROVAL_HIERARCHY_MESSAGES.approverWithoutAccess;
  return new DomainError("APPROVER_WITHOUT_ACCESS", message, 422, [
    { field: "approverUserId", code: "APPROVER_WITHOUT_ACCESS", message },
  ]);
}

/** `422 APPROVAL_LEVEL_NOT_FOUND` (api-specs 16 §16.2 langkah 1); `field` menunjuk level atau level berikutnya. */
export function approvalLevelNotFound(jobLevel: number, field: "jobLevel" | "upLevel"): DomainError {
  const message = APPROVAL_HIERARCHY_MESSAGES.levelNotFound(jobLevel);
  return new DomainError("APPROVAL_LEVEL_NOT_FOUND", message, 422, [
    { field, code: "APPROVAL_LEVEL_NOT_FOUND", message },
  ]);
}

/** `409 HIERARCHY_EXISTS` (api-specs 16 §16.2 langkah 3). */
export function hierarchyExists(): DomainError {
  return new DomainError("HIERARCHY_EXISTS", APPROVAL_HIERARCHY_MESSAGES.hierarchyExists, 409);
}
