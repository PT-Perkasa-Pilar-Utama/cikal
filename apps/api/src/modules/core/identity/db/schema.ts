import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  inet,
  integer,
  pgPolicy,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, bytea, tenantIsolation } from "../../../../platform/db/columns.js";
import { companies } from "../../tenancy/index.js";

export const iam = pgSchema("iam");

const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => companies.id);

const accessFlags = () => ({
  canView: boolean("can_view").notNull().default(false),
  canCreate: boolean("can_create").notNull().default(false),
  canUpdate: boolean("can_update").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  canApprove: boolean("can_approve").notNull().default(false),
});

/** View wajib bila hak lain diberikan (AC-09.03). */
const viewRequired = (name: string, table: { canView: AnyPgColumn } & Record<string, AnyPgColumn>) =>
  check(
    name,
    sql`${table.canView} or not (${table.canCreate} or ${table.canUpdate} or ${table.canDelete} or ${table.canApprove})`,
  );

/** MENUS [instalasi], technical-specs 06 §6.4. */
export const menus = iam.table(
  "menus",
  {
    id: uuid("id").primaryKey(),
    menuCode: text("menu_code").notNull().unique(),
    menuName: text("menu_name").notNull(),
    menuIndex: integer("menu_index").notNull(),
    parentMenuId: uuid("parent_menu_id").references((): AnyPgColumn => menus.id),
    link: text("link"),
    iconName: text("icon_name"),
    moduleCode: text("module_code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    check("menus_menu_name_check", sql`char_length(${table.menuName}) <= 50`),
    check("menus_menu_index_check", sql`${table.menuIndex} >= 1`),
  ],
);

/** ROLES, technical-specs 06 §6.4. */
export const roles = iam.table(
  "roles",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    roleName: text("role_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("roles_tenant_role_name_unique").on(table.tenantId, sql`lower(${table.roleName})`),
    // Minimal 3 karakter divalidasi di API; role seed "QA" (technical-specs 09 §9.5) lebih pendek.
    check("roles_role_name_check", sql`char_length(${table.roleName}) <= 50`),
    tenantIsolation(),
  ],
);

/**
 * USERS (UI label: "User Application"), technical-specs 06 §6.4. Foreign key unit kerja ke skema `org`
 * ditambahkan saat tabel Organization dibuat.
 */
export const users = iam.table(
  "users",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    username: text("username").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phoneNumber: text("phone_number"),
    authType: text("auth_type").notNull().default("LOCAL"),
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    roleId: uuid("role_id").references(() => roles.id),
    regionalId: uuid("regional_id"),
    branchId: uuid("branch_id"),
    subBranchId: uuid("sub_branch_id"),
    status: text("status").notNull().default("ACTIVE"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    ssoSubject: text("sso_subject"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (table) => [
    // Username unik per instalasi dan dicocokkan tanpa membedakan huruf besar dan kecil (api-specs 02 §2.2).
    uniqueIndex("users_username_unique").on(sql`lower(${table.username})`),
    unique("users_tenant_email_unique").on(table.tenantId, table.email),
    unique("users_tenant_sso_subject_unique").on(table.tenantId, table.ssoSubject),
    check("users_username_check", sql`char_length(${table.username}) between 3 and 50`),
    check("users_full_name_check", sql`char_length(${table.fullName}) <= 100`),
    check("users_auth_type_check", sql`${table.authType} in ('LOCAL', 'SSO')`),
    check("users_password_hash_check", sql`${table.authType} <> 'LOCAL' or ${table.passwordHash} is not null`),
    check("users_status_check", sql`${table.status} in ('NO_ROLE', 'ACTIVE', 'INACTIVE', 'LOCKED')`),
    tenantIsolation(),
    // DM-12: login membaca user berdasarkan username sebelum tenant diketahui (api-specs 02 §2.2).
    pgPolicy("login_lookup", {
      as: "permissive",
      for: "select",
      using: sql`lower(${table.username}) = nullif(current_setting('app.login_username', true), '')`,
    }),
  ],
);

/** ROLE_ACCESS, technical-specs 06 §6.4. */
export const roleAccess = iam.table(
  "role_access",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id),
    ...accessFlags(),
    ...auditColumns(),
  },
  (table) => [
    unique("role_access_role_menu_unique").on(table.roleId, table.menuId),
    viewRequired("role_access_view_required_check", table),
    tenantIsolation(),
  ],
);

/** USER_ACCESS: hak tambahan per user yang berlaku `valid_from` s.d. `valid_to` inklusif (technical-specs 09 §9.4). */
export const userAccess = iam.table(
  "user_access",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id),
    ...accessFlags(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to").notNull(),
    ...auditColumns(),
  },
  (table) => [
    unique("user_access_user_menu_valid_from_unique").on(table.userId, table.menuId, table.validFrom),
    viewRequired("user_access_view_required_check", table),
    check("user_access_valid_range_check", sql`${table.validTo} >= ${table.validFrom}`),
    tenantIsolation(),
  ],
);

/**
 * SESSIONS, technical-specs 06 §6.4. Policy `session_lookup` (DM-12) membuka satu baris yang hash token-nya
 * dipasang di `app.session_token_hash`, karena guard belum tahu tenant saat membaca cookie. Sesi yang diganti
 * login baru disimpan dengan `ended_reason = 'REPLACED'` agar cookie lamanya dijawab SESSION_REPLACED (AC-06.05).
 */
export const sessions = iam.table(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    tenantId: tenantId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: bytea("token_hash").notNull().unique(),
    channel: text("channel").notNull(),
    csrfTokenHash: bytea("csrf_token_hash"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: inet("ip_address"),
    endedReason: text("ended_reason"),
    ...auditColumns(),
  },
  (table) => [
    check("sessions_channel_check", sql`${table.channel} in ('WEB', 'MOBILE')`),
    check("sessions_ended_reason_check", sql`${table.endedReason} in ('REPLACED')`),
    // Satu sesi hidup per user per channel (api-specs 02 §2.1).
    uniqueIndex("sessions_user_channel_live_unique")
      .on(table.userId, table.channel)
      .where(sql`${table.endedReason} is null`),
    tenantIsolation(),
    pgPolicy("session_lookup", {
      as: "permissive",
      for: "select",
      using: sql`${table.tokenHash} = decode(nullif(current_setting('app.session_token_hash', true), ''), 'hex')`,
    }),
  ],
);

/** LOGIN_ATTEMPTS [instalasi]: username yang tidak terdaftar tidak punya tenant (technical-specs 06 §6.4). */
export const loginAttempts = iam.table("login_attempts", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  success: boolean("success").notNull(),
  ipAddress: inet("ip_address").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});
