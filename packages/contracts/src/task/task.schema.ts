import { z } from "zod";
import { dataEnvelope, pageEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";

/** Katalog antrean HumanTask yang punya menu (api-specs 14 §14.1). */
export const queueCodeSchema = z.enum([
  "VERIFICATION",
  "CREDIT_REPORT_UPLOAD",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
  "PROCESS_ERROR",
  "PRESCREEN_DEDUP",
  "PRESCREEN_DUKCAPIL_L1",
  "PRESCREEN_FRAUD",
  "PRESCREEN_DUKCAPIL_L2",
  "RECONTEST",
]);
export type QueueCode = z.infer<typeof queueCodeSchema>;

/** Status HumanTask (technical-specs 06 §6.13). */
export const taskStatusSchema = z.enum(["OPEN", "ASSIGNED", "CLOSED"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

/** Aksi yang boleh dilakukan user sesi pada satu tugas, dihitung server (api-specs 14 §14.2). */
export const taskActionSchema = z.enum(["ASSIGN", "PROCEED", "RELEASE", "RELEASE_OTHER"]);
export type TaskAction = z.infer<typeof taskActionSchema>;

const statusList = z
  .string()
  .transform((value) => value.split(","))
  .pipe(z.array(taskStatusSchema).min(1));

/** Query `GET /tasks` (api-specs 14 §14.2). */
export const taskListQuerySchema = z.object({
  queueCode: queueCodeSchema,
  status: statusList.default(["OPEN", "ASSIGNED"]),
  assignedToMe: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt,asc", "createdAt,desc", "loanId,asc", "loanId,desc"]).default("createdAt,asc"),
});
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const taskAssigneeSchema = z.object({ id, username: z.string() });

export const taskItemSchema = z.object({
  id,
  queueCode: queueCodeSchema,
  applicationId: id,
  loanId: z.string(),
  /** `null` sampai data debitur pengajuan dibangun di kartu BE-S3-01. */
  fullName: z.string().nullable(),
  productCode: z.string(),
  /** `null` sampai tabel cabang dibangun di kartu TL-S5-04. */
  branchCode: z.string().nullable(),
  status: taskStatusSchema,
  assignedTo: taskAssigneeSchema.nullable(),
  assignedAt: timestamp.nullable(),
  createdAt: timestamp,
  version: z.number().int().min(1),
  allowedActions: z.array(taskActionSchema),
});
export type TaskItem = z.infer<typeof taskItemSchema>;

/** `GET /tasks` (api-specs 14 §14.2). */
export const taskListResponseSchema = pageEnvelope(taskItemSchema);
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

/** Body `POST /tasks/{id}/assign` dan `POST /tasks/{id}/release`: versi untuk penguncian optimistis. */
export const taskVersionRequestSchema = z.strictObject({ version: z.number().int().min(1) });
export type TaskVersionRequest = z.infer<typeof taskVersionRequestSchema>;

/** Respons assign dan release (api-specs 14 §14.3, §14.4). */
export const taskStateResponseSchema = dataEnvelope(
  z.object({
    id,
    status: taskStatusSchema,
    assignedTo: taskAssigneeSchema.nullable(),
    version: z.number().int().min(1),
  }),
);
export type TaskStateResponse = z.infer<typeof taskStateResponseSchema>;
