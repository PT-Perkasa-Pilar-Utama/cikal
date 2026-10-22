import type { ChangeRequestDetailResponse, ChangeRequestListResponse } from "@cikal/contracts";
import type { UserRef } from "../../../../platform/http/user-directory-port.js";
import type { ChangeRequestRow } from "../db/change-requests.repository.js";
import { changedFields } from "../domain/changed-fields.js";
import { reviewBlock, reviewBlockedReason } from "../domain/review-policy.js";
import type { EntityHandler } from "./change-request-registry.js";

type ListItem = ChangeRequestListResponse["data"][number];
type Detail = ChangeRequestDetailResponse["data"];

/** Pembaca permintaan: id user sesi dan apakah ia punya hak APPROVE pada menu entity. */
export interface Viewer {
  userId: string;
  canApprove: boolean;
}

function submitter(users: Map<string, UserRef>, userId: string): { id: string; username: string } {
  const user = users.get(userId);
  // `submitted_by` ber-foreign key ke `iam.users`, jadi user yang hilang berarti data rusak.
  if (!user) throw new Error(`Submitter ${userId} of a change request does not exist`);
  return { id: user.id, username: user.username };
}

const canReview = (row: ChangeRequestRow, viewer: Viewer) =>
  viewer.canApprove && reviewBlock(row, viewer.userId) === null;

/** Baris halaman "Pending <Data>" (api-specs 07 §7.2). */
export function toListItem(
  row: ChangeRequestRow,
  handler: EntityHandler,
  users: Map<string, UserRef>,
  viewer: Viewer,
): ListItem {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    displayName: handler.displayName(row.newData),
    packageSize: row.packageSize,
    status: row.status,
    submittedBy: submitter(users, row.submittedBy),
    submittedAt: row.createdAt.toISOString(),
    canReview: canReview(row, viewer),
  };
}

/** Detail dengan "Current Data" dan "Proposed Data" (api-specs 07 §7.3, AC-12.02, AC-12.04). */
export function toDetail(
  row: ChangeRequestRow,
  handler: EntityHandler,
  users: Map<string, UserRef>,
  viewer: Viewer,
): Detail {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    packageSize: row.packageSize,
    status: row.status,
    submittedBy: submitter(users, row.submittedBy),
    submittedAt: row.createdAt.toISOString(),
    canReview: canReview(row, viewer),
    currentData: row.oldData,
    proposedData: row.newData,
    changedFields: handler.diff?.(row.oldData, row.newData) ?? changedFields(row.oldData, row.newData),
    reviseReason: row.reviseReason,
    reviewBlockedReason: reviewBlockedReason(row, viewer.userId),
  };
}
