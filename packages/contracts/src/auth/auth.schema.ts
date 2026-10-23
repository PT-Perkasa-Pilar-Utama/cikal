import { z } from "zod";
import { actionSchema } from "../common/menu.js";
import { moduleCodeSchema } from "../common/modules.js";
import { id } from "../common/scalars.js";

/** `POST /auth/login` (api-specs 02 §2.2). */
export const loginRequestSchema = z.strictObject({
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z.string().min(1, "Password is required").max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

const userSummarySchema = z.object({
  id,
  username: z.string(),
  fullName: z.string(),
  roleName: z.string(),
});

const companySummarySchema = z.object({
  companyCode: z.string(),
  companyName: z.string(),
});

export const loginResponseSchema = z.object({
  data: z.object({
    user: userSummarySchema,
    company: companySummarySchema,
    mustChangePassword: z.boolean(),
  }),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface SessionMenu {
  menuCode: string;
  menuName: string;
  link: string | null;
  iconName: string | null;
  actions: z.infer<typeof actionSchema>[];
  children: SessionMenu[];
}

export const sessionMenuSchema: z.ZodType<SessionMenu> = z.lazy(() =>
  z.object({
    menuCode: z.string(),
    menuName: z.string(),
    link: z.string().nullable(),
    iconName: z.string().nullable(),
    actions: z.array(actionSchema),
    children: z.array(sessionMenuSchema),
  }),
);

/** Status lisensi sesi: `NONE` bila company belum punya lisensi terverifikasi (api-specs 02 §2.4 langkah 5). */
export const sessionLicenseStatusSchema = z.enum(["ACTIVE", "EXPIRED", "NONE"]);
export type SessionLicenseStatus = z.infer<typeof sessionLicenseStatusSchema>;

/** `GET /auth/session` (api-specs 02 §2.4). */
export const sessionResponseSchema = z.object({
  data: z.object({
    user: userSummarySchema.extend({ branchCode: z.string().nullable() }),
    company: companySummarySchema.extend({ platformCode: z.string() }),
    mustChangePassword: z.boolean(),
    license: z.object({
      status: sessionLicenseStatusSchema,
      /** `null` bila status `NONE`. */
      validTo: z.iso.date().nullable(),
      /** Modul lisensi aktif yang juga ada di paket (PK-04); kosong bila status `NONE`. */
      modules: z.array(moduleCodeSchema),
    }),
    menus: z.array(sessionMenuSchema),
    sessionExpiresAt: z.iso.datetime(),
    idleTimeoutMinutes: z.number().int(),
  }),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
