CREATE SCHEMA IF NOT EXISTS "m07_dukcapil";
--> statement-breakpoint
CREATE TABLE "m07_dukcapil"."dukcapil_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"record_found" boolean NOT NULL,
	"provider_code" text,
	"provider_reference" text,
	"dob_status" text,
	"pob_status" text,
	"full_name_score" numeric(5, 4),
	"mother_name_score" numeric(5, 4),
	"final_score" numeric(5, 4),
	"rule" jsonb NOT NULL,
	"raw_response_enc" "bytea",
	"raw_response_key_version" integer,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dukcapil_results_outcome_check" CHECK ("m07_dukcapil"."dukcapil_results"."outcome" in ('PASSED', 'REVIEW', 'FAILED', 'SKIP')),
	CONSTRAINT "dukcapil_results_dob_status_check" CHECK ("m07_dukcapil"."dukcapil_results"."dob_status" in ('MATCH', 'NOT_MATCH')),
	CONSTRAINT "dukcapil_results_pob_status_check" CHECK ("m07_dukcapil"."dukcapil_results"."pob_status" in ('MATCH', 'NOT_MATCH'))
);
--> statement-breakpoint
ALTER TABLE "m07_dukcapil"."dukcapil_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m07_dukcapil"."dukcapil_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name_weight" numeric(9, 4) NOT NULL,
	"mother_name_weight" numeric(9, 4) NOT NULL,
	"passed_threshold" numeric(5, 4) NOT NULL,
	"review_threshold" numeric(5, 4) NOT NULL,
	"not_found_outcome" text DEFAULT 'REVIEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "dukcapil_rules_weights_check" CHECK ("m07_dukcapil"."dukcapil_rules"."name_weight" + "m07_dukcapil"."dukcapil_rules"."mother_name_weight" = 100),
	CONSTRAINT "dukcapil_rules_thresholds_check" CHECK ("m07_dukcapil"."dukcapil_rules"."review_threshold" < "m07_dukcapil"."dukcapil_rules"."passed_threshold"),
	CONSTRAINT "dukcapil_rules_not_found_outcome_check" CHECK ("m07_dukcapil"."dukcapil_rules"."not_found_outcome" in ('REVIEW', 'FAILED'))
);
--> statement-breakpoint
ALTER TABLE "m07_dukcapil"."dukcapil_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m07_dukcapil"."dukcapil_results" ADD CONSTRAINT "dukcapil_results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m07_dukcapil"."dukcapil_results" ADD CONSTRAINT "dukcapil_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m07_dukcapil"."dukcapil_rules" ADD CONSTRAINT "dukcapil_rules_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dukcapil_results_process_unique" ON "m07_dukcapil"."dukcapil_results" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "dukcapil_results_application_idx" ON "m07_dukcapil"."dukcapil_results" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dukcapil_rules_tenant_unique" ON "m07_dukcapil"."dukcapil_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m07_dukcapil"."dukcapil_results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m07_dukcapil"."dukcapil_rules" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);