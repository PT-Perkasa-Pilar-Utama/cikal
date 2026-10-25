CREATE SCHEMA IF NOT EXISTS "m09_scoring";
--> statement-breakpoint
CREATE TABLE "m09_scoring"."scoring_criteria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"field_code" text NOT NULL,
	"operator" text NOT NULL,
	"value" jsonb NOT NULL,
	"weight" numeric(8, 2),
	"criterion_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "scoring_criteria_operator_check" CHECK ("m09_scoring"."scoring_criteria"."operator" in ('EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'BETWEEN', 'IN')),
	CONSTRAINT "scoring_criteria_criterion_type_check" CHECK ("m09_scoring"."scoring_criteria"."criterion_type" in ('WEIGHTED', 'MANDATORY')),
	CONSTRAINT "scoring_criteria_weight_check" CHECK ("m09_scoring"."scoring_criteria"."weight" between -1000 and 1000)
);
--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_criteria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m09_scoring"."scoring_model_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_model_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m09_scoring"."scoring_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"model_code" text NOT NULL,
	"model_name" text NOT NULL,
	"model_group" text NOT NULL,
	"constant" numeric(12, 2),
	"cut_off" numeric(12, 2),
	"review_lower_bound" numeric(12, 2),
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"effective_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "scoring_models_version_unique" UNIQUE("tenant_id","model_code","version_number"),
	CONSTRAINT "scoring_models_model_group_check" CHECK ("m09_scoring"."scoring_models"."model_group" in ('SCORING', 'RAC')),
	CONSTRAINT "scoring_models_status_check" CHECK ("m09_scoring"."scoring_models"."status" in ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED'))
);
--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m09_scoring"."scoring_result_details" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scoring_result_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"display_text" text NOT NULL,
	"actual_value" text,
	"is_met" boolean NOT NULL,
	"applied_weight" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_result_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m09_scoring"."scoring_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"model_group" text NOT NULL,
	"total_score" numeric(12, 2),
	"outcome" text NOT NULL,
	"failed_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "scoring_results_model_group_check" CHECK ("m09_scoring"."scoring_results"."model_group" in ('SCORING', 'RAC')),
	CONSTRAINT "scoring_results_outcome_check" CHECK ("m09_scoring"."scoring_results"."outcome" in ('PASS', 'REVIEW', 'FAIL'))
);
--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_criteria" ADD CONSTRAINT "scoring_criteria_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_criteria" ADD CONSTRAINT "scoring_criteria_model_id_scoring_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "m09_scoring"."scoring_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_model_products" ADD CONSTRAINT "scoring_model_products_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_model_products" ADD CONSTRAINT "scoring_model_products_model_id_scoring_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "m09_scoring"."scoring_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_model_products" ADD CONSTRAINT "scoring_model_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_models" ADD CONSTRAINT "scoring_models_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_result_details" ADD CONSTRAINT "scoring_result_details_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_result_details" ADD CONSTRAINT "scoring_result_details_scoring_result_id_scoring_results_id_fk" FOREIGN KEY ("scoring_result_id") REFERENCES "m09_scoring"."scoring_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_result_details" ADD CONSTRAINT "scoring_result_details_criterion_id_scoring_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "m09_scoring"."scoring_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_results" ADD CONSTRAINT "scoring_results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_results" ADD CONSTRAINT "scoring_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m09_scoring"."scoring_results" ADD CONSTRAINT "scoring_results_model_id_scoring_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "m09_scoring"."scoring_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scoring_criteria_model_idx" ON "m09_scoring"."scoring_criteria" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_model_products_unique" ON "m09_scoring"."scoring_model_products" USING btree ("model_id","product_id");--> statement-breakpoint
CREATE INDEX "scoring_model_products_product_idx" ON "m09_scoring"."scoring_model_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "scoring_result_details_result_idx" ON "m09_scoring"."scoring_result_details" USING btree ("scoring_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_results_process_group_unique" ON "m09_scoring"."scoring_results" USING btree ("process_instance_id","model_group");--> statement-breakpoint
CREATE INDEX "scoring_results_application_idx" ON "m09_scoring"."scoring_results" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m09_scoring"."scoring_criteria" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m09_scoring"."scoring_model_products" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m09_scoring"."scoring_models" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m09_scoring"."scoring_result_details" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m09_scoring"."scoring_results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);