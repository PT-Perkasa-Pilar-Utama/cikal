CREATE SCHEMA IF NOT EXISTS "org";
--> statement-breakpoint
CREATE TABLE "org"."branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"regional_id" uuid NOT NULL,
	"branch_code" text NOT NULL,
	"branch_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "branches_regional_code_unique" UNIQUE("regional_id","branch_code")
);
--> statement-breakpoint
ALTER TABLE "org"."branches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org"."regionals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"regional_code" text NOT NULL,
	"regional_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "regionals_tenant_code_unique" UNIQUE("tenant_id","regional_code"),
	CONSTRAINT "regionals_code_check" CHECK ("org"."regionals"."regional_code" ~ '^[0-9]{2,3}$')
);
--> statement-breakpoint
ALTER TABLE "org"."regionals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org"."sub_branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"sub_branch_code" text NOT NULL,
	"sub_branch_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "sub_branches_branch_code_unique" UNIQUE("branch_id","sub_branch_code")
);
--> statement-breakpoint
ALTER TABLE "org"."sub_branches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "org"."branches" ADD CONSTRAINT "branches_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org"."branches" ADD CONSTRAINT "branches_regional_id_regionals_id_fk" FOREIGN KEY ("regional_id") REFERENCES "org"."regionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org"."regionals" ADD CONSTRAINT "regionals_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org"."sub_branches" ADD CONSTRAINT "sub_branches_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org"."sub_branches" ADD CONSTRAINT "sub_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "org"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "org"."branches" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "org"."regionals" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "org"."sub_branches" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);