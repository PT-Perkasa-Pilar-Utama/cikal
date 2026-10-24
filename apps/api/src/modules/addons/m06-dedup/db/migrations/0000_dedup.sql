CREATE SCHEMA IF NOT EXISTS "m06_dedup";
--> statement-breakpoint
CREATE TABLE "m06_dedup"."dedup_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"dedup_result_id" uuid NOT NULL,
	"candidate_application_id" uuid NOT NULL,
	"candidate_loan_id" text NOT NULL,
	"candidate_status" text NOT NULL,
	"nik_result" text NOT NULL,
	"dob_result" text NOT NULL,
	"pob_result" text NOT NULL,
	"name_score" numeric(5, 4) NOT NULL,
	"mother_name_score" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dedup_candidates_nik_result_check" CHECK ("nik_result" in ('MATCH', 'UNMATCH')),
	CONSTRAINT "dedup_candidates_dob_result_check" CHECK ("dob_result" in ('MATCH', 'UNMATCH')),
	CONSTRAINT "dedup_candidates_pob_result_check" CHECK ("pob_result" in ('MATCH', 'UNMATCH'))
);
--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m06_dedup"."dedup_field_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"field_code" text NOT NULL,
	"algorithm" text NOT NULL,
	"fuzzy_threshold" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dedup_field_settings_field_code_check" CHECK ("field_code" in ('FULL_NAME_ID', 'MOTHER_MAIDEN_NAME')),
	CONSTRAINT "dedup_field_settings_algorithm_check" CHECK ("algorithm" in ('LEVENSHTEIN_RATIO', 'JARO_WINKLER', 'TOKEN_SET_RATIO')),
	CONSTRAINT "dedup_field_settings_fuzzy_threshold_check" CHECK ("m06_dedup"."dedup_field_settings"."fuzzy_threshold" between 50 and 100)
);
--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_field_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m06_dedup"."dedup_matrix" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"nik" text NOT NULL,
	"full_name_id" text NOT NULL,
	"dob" text NOT NULL,
	"pob" text NOT NULL,
	"mother_maiden_name" text NOT NULL,
	"dedup_outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dedup_matrix_priority_check" CHECK ("m06_dedup"."dedup_matrix"."priority" >= 1),
	CONSTRAINT "dedup_matrix_nik_check" CHECK ("nik" in ('MATCH', 'UNMATCH', 'ANY')),
	CONSTRAINT "dedup_matrix_dob_check" CHECK ("dob" in ('MATCH', 'UNMATCH', 'ANY')),
	CONSTRAINT "dedup_matrix_pob_check" CHECK ("pob" in ('MATCH', 'UNMATCH', 'ANY')),
	CONSTRAINT "dedup_matrix_full_name_id_check" CHECK ("full_name_id" in ('MATCH', 'UNMATCH', 'FUZZY', 'ANY')),
	CONSTRAINT "dedup_matrix_mother_maiden_name_check" CHECK ("mother_maiden_name" in ('MATCH', 'UNMATCH', 'FUZZY', 'ANY')),
	CONSTRAINT "dedup_matrix_dedup_outcome_check" CHECK ("dedup_outcome" in ('MATCH', 'UNMATCH', 'REVIEW', 'SKIP'))
);
--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_matrix" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m06_dedup"."dedup_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"matched_application_id" uuid,
	"matrix_row_id" uuid,
	"matrix_row_priority" integer,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dedup_results_outcome_check" CHECK ("outcome" in ('MATCH', 'UNMATCH', 'REVIEW', 'SKIP', 'DUPLICATE_IN_FLIGHT'))
);
--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_candidates" ADD CONSTRAINT "dedup_candidates_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_candidates" ADD CONSTRAINT "dedup_candidates_dedup_result_id_dedup_results_id_fk" FOREIGN KEY ("dedup_result_id") REFERENCES "m06_dedup"."dedup_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_candidates" ADD CONSTRAINT "dedup_candidates_candidate_application_id_applications_id_fk" FOREIGN KEY ("candidate_application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_field_settings" ADD CONSTRAINT "dedup_field_settings_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_matrix" ADD CONSTRAINT "dedup_matrix_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_results" ADD CONSTRAINT "dedup_results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_results" ADD CONSTRAINT "dedup_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_results" ADD CONSTRAINT "dedup_results_matched_application_id_applications_id_fk" FOREIGN KEY ("matched_application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m06_dedup"."dedup_results" ADD CONSTRAINT "dedup_results_matrix_row_id_dedup_matrix_id_fk" FOREIGN KEY ("matrix_row_id") REFERENCES "m06_dedup"."dedup_matrix"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dedup_candidates_result_idx" ON "m06_dedup"."dedup_candidates" USING btree ("dedup_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dedup_field_settings_field_unique" ON "m06_dedup"."dedup_field_settings" USING btree ("tenant_id","field_code");--> statement-breakpoint
CREATE INDEX "dedup_matrix_priority_idx" ON "m06_dedup"."dedup_matrix" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "dedup_results_process_unique" ON "m06_dedup"."dedup_results" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "dedup_results_application_idx" ON "m06_dedup"."dedup_results" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m06_dedup"."dedup_candidates" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m06_dedup"."dedup_field_settings" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m06_dedup"."dedup_matrix" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m06_dedup"."dedup_results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);