import { type QueueCode, type TaskItem, taskListResponseSchema, taskStateResponseSchema } from "@cikal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";

const TASKS_KEY = "tasks";

type TaskCommand = "assign" | "release";

/** `GET /api/v1/tasks` satu antrean, status bawaan `OPEN,ASSIGNED` (api-specs 14 §14.2). */
export function useTasks(queueCode: QueueCode, page: number) {
  return useQuery({
    queryKey: [TASKS_KEY, queueCode, page],
    queryFn: () => apiRequest(taskListResponseSchema, `/v1/tasks?queueCode=${queueCode}&page=${page}`),
  });
}

/**
 * Assign atau release dengan `version` baris untuk penguncian optimistis (api-specs 14 §14.3, §14.4). Daftar dimuat
 * ulang setelah selesai, berhasil atau gagal, agar tugas yang lebih dulu diambil orang lain tampil dengan
 * pengambilnya (AC-58.04).
 */
export function useTaskCommand(command: TaskCommand) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Pick<TaskItem, "id" | "version">) =>
      apiRequest(taskStateResponseSchema, `/v1/tasks/${task.id}/${command}`, {
        method: "POST",
        body: JSON.stringify({ version: task.version }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}
