import { z } from "zod";
import { pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

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

/** `GET /role-access` (api-specs 03 §3.3). */
export const roleAccessListResponseSchema = pageEnvelope(roleAccessItemSchema);
export type RoleAccessListResponse = z.infer<typeof roleAccessListResponseSchema>;

/** `POST /role-access` (api-specs 03 §3.4). */
export const roleAccessCreateRequestSchema = z.strictObject({ roleId: id, menuId: id, ...accessFlags });
export type RoleAccessCreateRequest = z.infer<typeof roleAccessCreateRequestSchema>;

/** `PUT /role-access/{id}` (api-specs 03 §3.5). */
export const roleAccessUpdateRequestSchema = z.strictObject(accessFlags);
export type RoleAccessUpdateRequest = z.infer<typeof roleAccessUpdateRequestSchema>;
