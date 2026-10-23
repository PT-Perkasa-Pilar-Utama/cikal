import type { TaskStateResponse } from "@cikal/contracts";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import type { TaskRow } from "../db/human-tasks.repository.js";

/** Respons assign dan release (api-specs 14 §14.3, §14.4). */
export async function taskState(tx: Tx, users: UserDirectoryPort, task: TaskRow): Promise<TaskStateResponse> {
  const assignee = task.assignedUserId
    ? (await users.describe(tx, [task.assignedUserId])).get(task.assignedUserId)
    : null;
  return {
    data: {
      id: task.id,
      status: task.status,
      assignedTo: assignee ? { id: assignee.id, username: assignee.username } : null,
      version: task.version,
    },
  };
}
