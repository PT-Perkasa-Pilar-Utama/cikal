import { DomainError } from "../../../../platform/http/domain-error.js";

/** Error antrean tugas dan pesan persis AC (api-specs 14 §14.3 s.d. §14.5). */
export const taskErrors = {
  /** AC-58.04: pengambil pertama menang. */
  alreadyAssigned: (username: string): DomainError =>
    new DomainError("TASK_ALREADY_ASSIGNED", `This task has already been assigned to ${username}`, 409),
  versionConflict: (): DomainError =>
    new DomainError("TASK_VERSION_CONFLICT", "This task has changed. Please refresh", 409),
  /** AC-58.02: tugas milik orang lain tidak bisa dikerjakan. */
  notAssignedToYou: (): DomainError =>
    new DomainError("TASK_NOT_ASSIGNED_TO_YOU", "This task is assigned to another user", 403),
};
