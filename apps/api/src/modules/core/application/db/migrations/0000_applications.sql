CREATE SCHEMA IF NOT EXISTS "application";
--> statement-breakpoint
CREATE TABLE "application"."applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"loan_id" text NOT NULL,
	"channel" text NOT NULL,
	"product_category" text NOT NULL,
	"product_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"current_step" text,
	"return_note" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "applications_tenant_loan_id_unique" UNIQUE("tenant_id","loan_id"),
	CONSTRAINT "applications_status_check" CHECK ("application"."applications"."status" in ('DRAFT', 'ON_PROGRESS', 'RECONTEST', 'APPROVED', 'DISBURSED', 'FINISHED_REJECTED', 'FINISHED_CANCELLED')),
	CONSTRAINT "applications_channel_check" CHECK ("application"."applications"."channel" in ('WEB', 'MOBILE', 'API', 'UPLOAD')),
	CONSTRAINT "applications_product_category_check" CHECK ("application"."applications"."product_category" in ('COLLATERAL', 'NON_COLLATERAL', 'PENSION', 'SYARIAH')),
	CONSTRAINT "applications_current_step_check" CHECK ("application"."applications"."current_step" in ('DATA_ENTRY', 'SURVEY', 'DEDUP', 'DUKCAPIL', 'NAME_SCREENING', 'VERIFICATION', 'FRAUD', 'RAC', 'SCORING', 'CREDIT_BUREAU', 'DECISION', 'SIKP', 'APPROVAL', 'EPOLIS', 'VALIDITY_CHECK', 'PRINT_AKAD', 'DISBURSEMENT', 'WAIT_CORE'))
);
--> statement-breakpoint
ALTER TABLE "application"."applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."applications" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);