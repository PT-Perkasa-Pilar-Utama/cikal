import type { QueueCode, TaskAction, TaskStatus } from "@cikal/contracts";
import { QUEUE_CATALOG } from "./queue-catalog.js";

/** Unit kerja user (technical-specs 09 §9.4 lingkup data); semua `null` = role pusat. */
export interface WorkUnit {
  regionalId: string | null;
  branchId: string | null;
  subBranchId: string | null;
  /** Cabang di regional user, dari `org.branches`; kosong bila user punya cabang atau sub cabang. */
  regionalBranchIds: readonly string[];
}

/** Fakta user sesi untuk aturan antrean; hak menu sudah dihitung dari menu antrean dan menu Supervisor. */
export interface TaskViewer {
  userId: string;
  roleId: string | null;
  workUnit: WorkUnit;
  /** View pada menu antrean: melihat tugas yang boleh diambil. */
  canView: boolean;
  /** Update pada menu antrean: mengambil, mengerjakan, dan melepas tugas sendiri. */
  canWork: boolean;
  /** Update pada menu Supervisor: melepas tugas orang lain di cabangnya. */
  isSupervisor: boolean;
}

export interface TaskFacts {
  queueCode: QueueCode;
  status: TaskStatus;
  branchId: string | null;
  eligibleRoleId: string | null;
  assignedUserId: string | null;
}

/** Cabang yang dicakup unit kerja: role pusat semua cabang, role regional cabang di regionalnya, selain itu cabangnya. */
export function branchScope(unit: WorkUnit): "ALL" | string[] {
  if (!unit.regionalId && !unit.branchId && !unit.subBranchId) return "ALL";
  if (!unit.branchId && !unit.subBranchId) return [...unit.regionalBranchIds];
  return [unit.branchId, unit.subBranchId].filter((id): id is string => id !== null);
}

/** Tugas tanpa cabang belum terikat cabang pengajuan, jadi terlihat di seluruh company. */
export function coversBranch(unit: WorkUnit, branchId: string | null): boolean {
  const scope = branchScope(unit);
  return branchId === null || scope === "ALL" || scope.includes(branchId);
}

/** Boleh mengambil tugas: role sama dengan `eligibleRoleId` (bila diisi) dan unit kerja mencakup cabang tugas. */
export function isEligible(task: TaskFacts, viewer: TaskViewer): boolean {
  const roleMatches = task.eligibleRoleId === null || task.eligibleRoleId === viewer.roleId;
  return roleMatches && coversBranch(viewer.workUnit, task.branchId);
}

/** `allowedActions` api-specs 14 §14.2; tugas milik orang lain tidak punya ASSIGN dan PROCEED (AC-58.02, AC-58.06). */
export function allowedActions(task: TaskFacts, viewer: TaskViewer): TaskAction[] {
  const { selfAssign } = QUEUE_CATALOG[task.queueCode];
  const mine = task.status === "ASSIGNED" && task.assignedUserId === viewer.userId;
  const actions: TaskAction[] = [];
  if (task.status === "OPEN" && selfAssign && viewer.canWork && isEligible(task, viewer)) actions.push("ASSIGN");
  if (mine && selfAssign && viewer.canWork) actions.push("RELEASE");
  if (mine && viewer.canWork) actions.push("PROCEED");
  if (task.status === "ASSIGNED" && !mine && canReleaseOther(task, viewer)) actions.push("RELEASE_OTHER");
  return actions;
}

/** Tugas yang tampil di antrean user (api-specs 14 §14.2); di luar ini `NOT_FOUND`. */
export function isVisible(task: TaskFacts, viewer: TaskViewer): boolean {
  if (task.assignedUserId === viewer.userId) return true;
  if (!QUEUE_CATALOG[task.queueCode].selfAssign) return false;
  return (viewer.canView && isEligible(task, viewer)) || canReleaseOther(task, viewer);
}

/** Bentuk `isVisible` untuk query satu antrean; `null` = jalur itu tidak berlaku bagi user. */
export interface VisibilityScope {
  userId: string;
  eligible: { branches: "ALL" | string[]; roleId: string | null } | null;
  supervisedBranches: "ALL" | string[] | null;
}

export function visibilityScope(queueCode: QueueCode, viewer: TaskViewer): VisibilityScope {
  const { selfAssign } = QUEUE_CATALOG[queueCode];
  const branches = branchScope(viewer.workUnit);
  return {
    userId: viewer.userId,
    eligible: selfAssign && viewer.canView ? { branches, roleId: viewer.roleId } : null,
    supervisedBranches: selfAssign && viewer.isSupervisor ? branches : null,
  };
}

/** Supervisor melepas tugas tertahan orang lain di cabangnya (AC-58.05). */
export function canReleaseOther(task: TaskFacts, viewer: TaskViewer): boolean {
  return (
    viewer.isSupervisor && QUEUE_CATALOG[task.queueCode].selfAssign && coversBranch(viewer.workUnit, task.branchId)
  );
}
