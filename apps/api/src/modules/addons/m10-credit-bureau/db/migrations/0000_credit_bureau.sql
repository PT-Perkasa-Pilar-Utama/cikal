CREATE SCHEMA IF NOT EXISTS "m10_credit_bureau";
--> statement-breakpoint
CREATE TABLE "m10_credit_bureau"."credit_facilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"result_id" uuid NOT NULL,
	"lender_name" text NOT NULL,
	"facility_type" text NOT NULL,
	"plafond" numeric(18, 2) NOT NULL,
	"outstanding" numeric(18, 2) NOT NULL,
	"collectibility" integer NOT NULL,
	"days_past_due" integer NOT NULL,
	"condition" text NOT NULL,
	"last_updated" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "credit_facilities_condition_check" CHECK ("m10_credit_bureau"."credit_facilities"."condition" in ('ACTIVE', 'CLOSED'))
);
--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."credit_facilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m10_credit_bureau"."outcome_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"collectibility" integer,
	"quality" text NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "outcome_mappings_collectibility_unique" UNIQUE NULLS NOT DISTINCT("tenant_id","collectibility"),
	CONSTRAINT "outcome_mappings_collectibility_check" CHECK ("m10_credit_bureau"."outcome_mappings"."collectibility" between 1 and 5),
	CONSTRAINT "outcome_mappings_outcome_check" CHECK ("m10_credit_bureau"."outcome_mappings"."outcome" in ('COLLECT_1', 'COLLECT_2', 'COLLECT_3', 'COLLECT_4', 'COLLECT_5', 'NO_HISTORY'))
);
--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."outcome_mappings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m10_credit_bureau"."results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"provider_code" text NOT NULL,
	"mode" text NOT NULL,
	"report_reference" text,
	"report_date" date,
	"has_history" boolean NOT NULL,
	"aggregated_collectibility" integer,
	"quality" text NOT NULL,
	"outcome" text NOT NULL,
	"report_file_id" uuid,
	"raw_response_enc" "bytea",
	"raw_response_key_version" integer,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "results_mode_check" CHECK ("m10_credit_bureau"."results"."mode" in ('SYNC', 'ASYNC', 'MANUAL')),
	CONSTRAINT "results_outcome_check" CHECK ("m10_credit_bureau"."results"."outcome" in ('COLLECT_1', 'COLLECT_2', 'COLLECT_3', 'COLLECT_4', 'COLLECT_5', 'NO_HISTORY'))
);
--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."credit_facilities" ADD CONSTRAINT "credit_facilities_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."credit_facilities" ADD CONSTRAINT "credit_facilities_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "m10_credit_bureau"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."outcome_mappings" ADD CONSTRAINT "outcome_mappings_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."results" ADD CONSTRAINT "results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m10_credit_bureau"."results" ADD CONSTRAINT "results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_facilities_result_idx" ON "m10_credit_bureau"."credit_facilities" USING btree ("result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_process_unique" ON "m10_credit_bureau"."results" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "results_application_idx" ON "m10_credit_bureau"."results" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m10_credit_bureau"."credit_facilities" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m10_credit_bureau"."outcome_mappings" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m10_credit_bureau"."results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);