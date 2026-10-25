CREATE SCHEMA IF NOT EXISTS "approval";
--> statement-breakpoint
CREATE TABLE "approval"."hierarchies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"job_level" integer NOT NULL,
	"sub_level" integer NOT NULL,
	"up_level" integer,
	"up_sub_level" integer,
	"approver_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "hierarchies_assignment_unique" UNIQUE("branch_id","product_id","job_level","sub_level","approver_user_id"),
	CONSTRAINT "hierarchies_sub_level_check" CHECK ("approval"."hierarchies"."sub_level" >= 1),
	CONSTRAINT "hierarchies_up_level_check" CHECK (("approval"."hierarchies"."up_level" is null) = ("approval"."hierarchies"."up_sub_level" is null))
);
--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval"."levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"job_level" integer NOT NULL,
	"description" text NOT NULL,
	"amount_begin" numeric(18, 2) NOT NULL,
	"amount_end" numeric(18, 2) NOT NULL,
	"is_approve" boolean NOT NULL,
	"is_reject" boolean NOT NULL,
	"is_return" boolean NOT NULL,
	"is_cancel" boolean NOT NULL,
	"is_final_approver" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "levels_branch_product_level_unique" UNIQUE("branch_id","product_id","job_level"),
	CONSTRAINT "levels_job_level_check" CHECK ("approval"."levels"."job_level" >= 1),
	CONSTRAINT "levels_amount_check" CHECK ("approval"."levels"."amount_end" > "approval"."levels"."amount_begin")
);
--> statement-breakpoint
ALTER TABLE "approval"."levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ADD CONSTRAINT "hierarchies_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ADD CONSTRAINT "hierarchies_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "org"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ADD CONSTRAINT "hierarchies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ADD CONSTRAINT "hierarchies_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."hierarchies" ADD CONSTRAINT "hierarchies_level_fk" FOREIGN KEY ("branch_id","product_id","job_level") REFERENCES "approval"."levels"("branch_id","product_id","job_level") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."levels" ADD CONSTRAINT "levels_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."levels" ADD CONSTRAINT "levels_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "org"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."levels" ADD CONSTRAINT "levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "approval"."hierarchies" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "approval"."levels" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);