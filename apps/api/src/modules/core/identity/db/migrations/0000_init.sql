CREATE SCHEMA IF NOT EXISTS "iam";
--> statement-breakpoint
CREATE TABLE "iam"."menus" (
	"id" uuid PRIMARY KEY NOT NULL,
	"menu_code" text NOT NULL,
	"menu_name" text NOT NULL,
	"menu_index" integer NOT NULL,
	"parent_menu_id" uuid,
	"link" text,
	"icon_name" text,
	"module_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "menus_menu_code_unique" UNIQUE("menu_code"),
	CONSTRAINT "menus_menu_name_check" CHECK (char_length("iam"."menus"."menu_name") <= 50),
	CONSTRAINT "menus_menu_index_check" CHECK ("iam"."menus"."menu_index" >= 1)
);
--> statement-breakpoint
CREATE TABLE "iam"."role_access" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_update" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "role_access_role_menu_unique" UNIQUE("role_id","menu_id"),
	CONSTRAINT "role_access_view_required_check" CHECK ("iam"."role_access"."can_view" or not ("iam"."role_access"."can_create" or "iam"."role_access"."can_update" or "iam"."role_access"."can_delete" or "iam"."role_access"."can_approve"))
);
--> statement-breakpoint
ALTER TABLE "iam"."role_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "iam"."roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "roles_role_name_check" CHECK (char_length("iam"."roles"."role_name") <= 50)
);
--> statement-breakpoint
ALTER TABLE "iam"."roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "iam"."sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"channel" text NOT NULL,
	"csrf_token_hash" "bytea",
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_channel_check" CHECK ("iam"."sessions"."channel" in ('WEB', 'MOBILE'))
);
--> statement-breakpoint
ALTER TABLE "iam"."sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "iam"."user_access" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_update" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "user_access_user_menu_valid_from_unique" UNIQUE("user_id","menu_id","valid_from"),
	CONSTRAINT "user_access_view_required_check" CHECK ("iam"."user_access"."can_view" or not ("iam"."user_access"."can_create" or "iam"."user_access"."can_update" or "iam"."user_access"."can_delete" or "iam"."user_access"."can_approve")),
	CONSTRAINT "user_access_valid_range_check" CHECK ("iam"."user_access"."valid_to" >= "iam"."user_access"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "iam"."user_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "iam"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_number" text,
	"auth_type" text DEFAULT 'LOCAL' NOT NULL,
	"password_hash" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"role_id" uuid,
	"regional_id" uuid,
	"branch_id" uuid,
	"sub_branch_id" uuid,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"sso_subject" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "users_tenant_email_unique" UNIQUE("tenant_id","email"),
	CONSTRAINT "users_tenant_sso_subject_unique" UNIQUE("tenant_id","sso_subject"),
	CONSTRAINT "users_username_check" CHECK (char_length("iam"."users"."username") between 3 and 50),
	CONSTRAINT "users_full_name_check" CHECK (char_length("iam"."users"."full_name") <= 100),
	CONSTRAINT "users_auth_type_check" CHECK ("iam"."users"."auth_type" in ('LOCAL', 'SSO')),
	CONSTRAINT "users_password_hash_check" CHECK ("iam"."users"."auth_type" <> 'LOCAL' or "iam"."users"."password_hash" is not null),
	CONSTRAINT "users_status_check" CHECK ("iam"."users"."status" in ('NO_ROLE', 'ACTIVE', 'INACTIVE', 'LOCKED'))
);
--> statement-breakpoint
ALTER TABLE "iam"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "iam"."menus" ADD CONSTRAINT "menus_parent_menu_id_menus_id_fk" FOREIGN KEY ("parent_menu_id") REFERENCES "iam"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_access" ADD CONSTRAINT "role_access_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_access" ADD CONSTRAINT "role_access_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_access" ADD CONSTRAINT "role_access_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "iam"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."roles" ADD CONSTRAINT "roles_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_access" ADD CONSTRAINT "user_access_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_access" ADD CONSTRAINT "user_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_access" ADD CONSTRAINT "user_access_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "iam"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."users" ADD CONSTRAINT "users_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenant_role_name_unique" ON "iam"."roles" USING btree ("tenant_id",lower("role_name"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "iam"."users" USING btree (lower("username"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "iam"."role_access" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "iam"."roles" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "iam"."sessions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "session_lookup" ON "iam"."sessions" AS PERMISSIVE FOR SELECT TO public USING ("iam"."sessions"."token_hash" = decode(nullif(current_setting('app.session_token_hash', true), ''), 'hex'));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "iam"."user_access" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "iam"."users" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);