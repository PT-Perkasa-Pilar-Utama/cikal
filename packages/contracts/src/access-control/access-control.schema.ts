import { z } from "zod";
import { pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");
const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** Query `GET /roles` (api-specs 03 §3.1). */
export const roleListQuerySchema = z.object({
  isActive: booleanQuery.default(true),
  q: z.string().trim().min(1).optional(),
  ...pageFields,
  sort: z.enum(["roleName,asc", "roleName,desc"]).default("roleName,asc"),
});
export type RoleListQuery = z.infer<typeof roleListQuerySchema>;

/** `GET /roles` (api-specs 03 §3.1). */
export const roleSchema = z.object({ id, roleName: z.string(), isActive: z.boolean() });
export const roleListResponseSchema = pageEnvelope(roleSchema);
export type RoleListResponse = z.infer<typeof roleListResponseSchema>;

export interface MenuNode {
  id: string;
  menuCode: string;
  menuName: string;
  menuIndex: number;
  link: string | null;
  moduleCode: string;
  children: MenuNode[];
}

export const menuNodeSchema: z.ZodType<MenuNode> = z.lazy(() =>
  z.object({
    id: z.uuid(),
    menuCode: z.string(),
    menuName: z.string(),
    menuIndex: z.number().int().min(1),
    link: z.string().nullable(),
    moduleCode: z.string(),
    children: z.array(menuNodeSchema),
  }),
);

/** Query `GET /menus` (api-specs 03 §3.2). */
export const menuTreeQuerySchema = z.object({ includeInactive: booleanQuery.default(false) });
export type MenuTreeQuery = z.infer<typeof menuTreeQuerySchema>;

/** `GET /menus` (api-specs 03 §3.2). */
export const menuTreeResponseSchema = z.object({ data: z.array(menuNodeSchema) });
export type MenuTreeResponse = z.infer<typeof menuTreeResponseSchema>;

const accessFlags = {
  canView: z.boolean(),
  canCreate: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canApprove: z.boolean(),
};

export const roleAccessItemSchema = z.object({
  id,
  role: z.object({ id, roleName: z.string() }),
  menu: z.object({ id, menuCode: z.string(), menuName: z.string(), parentMenuName: z.string().nullable() }),
  ...accessFlags,
  hasPendingChange: z.boolean(),
});

/** Query `GET /role-access` (api-specs 03 §3.3). */
export const roleAccessListQuerySchema = z.object({
  roleId: id.optional(),
  menuId: id.optional(),
  ...pageFields,
  sort: z.enum(["roleName,asc", "roleName,desc", "menuName,asc", "menuName,desc"]).default("roleName,asc"),
});
export type RoleAccessListQuery = z.infer<typeof roleAccessListQuerySchema>;

/** `GET /role-access` (api-specs 03 §3.3). */
export const roleAccessListResponseSchema = pageEnvelope(roleAccessItemSchema);
export type RoleAccessListResponse = z.infer<typeof roleAccessListResponseSchema>;

/** `POST /role-access` (api-specs 03 §3.4). */
export const roleAccessCreateRequestSchema = z.strictObject({ roleId: id, menuId: id, ...accessFlags });
export type RoleAccessCreateRequest = z.infer<typeof roleAccessCreateRequestSchema>;

/** `PUT /role-access/{id}` (api-specs 03 §3.5). */
export const roleAccessUpdateRequestSchema = z.strictObject(accessFlags);
export type RoleAccessUpdateRequest = z.infer<typeof roleAccessUpdateRequestSchema>;

/**
 * Hak akses satu role pada satu menu: isi `currentData` dan `proposedData` ChangeRequest `ROLE_ACCESS`
 * (api-specs 07 §7.3). Nama role dan menu ikut disimpan untuk nama baris di "Pending Role Access".
 */
export const roleAccessDataSchema = z.object({
  roleId: id,
  roleName: z.string(),
  menuId: id,
  menuCode: z.string(),
  menuName: z.string(),
  ...accessFlags,
});
export type RoleAccessData = z.infer<typeof roleAccessDataSchema>;
