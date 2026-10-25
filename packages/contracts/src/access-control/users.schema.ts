import { z } from "zod";
import { pageEnvelope } from "../common/envelope.js";
import { actionSchema, menuCodeSchema } from "../common/menu.js";
import { id } from "../common/scalars.js";

export const userStatusSchema = z.enum(["NO_ROLE", "ACTIVE", "INACTIVE", "LOCKED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** Hak `<menuCode>:<action>`, contoh `OPS-APPROVAL:APPROVE` (api-specs 03 §3.6). */
export const menuAccessSchema = z
  .string()
  .regex(/^[A-Z0-9-]+:[A-Z]+$/)
  .transform((value) => {
    const [menuCode, action] = value.split(":");
    return { menuCode, action };
  })
  .pipe(z.object({ menuCode: menuCodeSchema, action: actionSchema }));
export type MenuAccess = z.infer<typeof menuAccessSchema>;

/** Query `GET /users` (api-specs 03 §3.6). */
export const userListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: userStatusSchema.default("ACTIVE"),
  branchId: id.optional(),
  withAccess: menuAccessSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["username,asc", "username,desc", "fullName,asc", "fullName,desc"]).default("username,asc"),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Baris dropdown user; email dan nomor telepon tidak dikembalikan (api-specs 03 §3.6). */
export const userListItemSchema = z.object({
  id,
  username: z.string(),
  fullName: z.string(),
  roleName: z.string().nullable(),
  branchCode: z.string().nullable(),
  status: userStatusSchema,
});
export type UserListItem = z.infer<typeof userListItemSchema>;

export const userListResponseSchema = pageEnvelope(userListItemSchema);
export type UserListResponse = z.infer<typeof userListResponseSchema>;
