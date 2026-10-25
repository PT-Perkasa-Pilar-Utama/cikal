CREATE SCHEMA IF NOT EXISTS "m08_fraud";
--> statement-breakpoint
CREATE TABLE "m08_fraud"."blacklists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text,
	"id_card_number_enc" "bytea",
	"id_card_number_key_version" integer,
	"id_card_number_bidx" "bytea",
	"ip_address" "inet",
	"reason" text NOT NULL,
	"source_application_id" uuid,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "blacklists_identity_check" CHECK ("m08_fraud"."blacklists"."id_card_number_bidx" is not null or "m08_fraud"."blacklists"."ip_address" is not null or "m08_fraud"."blacklists"."full_name" is not null)
);
--> statement-breakpoint
ALTER TABLE "m08_fraud"."blacklists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m08_fraud"."fraud_matrix" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"name_condition" text NOT NULL,
	"ip_condition" text NOT NULL,
	"fraud_outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "fraud_matrix_priority_check" CHECK ("m08_fraud"."fraud_matrix"."priority" >= 1),
	CONSTRAINT "fraud_matrix_name_condition_check" CHECK ("m08_fraud"."fraud_matrix"."name_condition" in ('NORMAL', 'EXCEEDED', 'ANY')),
	CONSTRAINT "fraud_matrix_ip_condition_check" CHECK ("m08_fraud"."fraud_matrix"."ip_condition" in ('NORMAL', 'VPN_PROXY', 'LOCATION_MISMATCH', 'NOT_APPLICABLE', 'ANY')),
	CONSTRAINT "fraud_matrix_fraud_outcome_check" CHECK ("m08_fraud"."fraud_matrix"."fraud_outcome" in ('CLEAN', 'SUSPICIOUS', 'HIGH_FRAUD_POTENTIAL'))
);
--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_matrix" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m08_fraud"."fraud_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"is_blacklisted" boolean NOT NULL,
	"ip_status" text NOT NULL,
	"ip_category" text,
	"ip_address" "inet",
	"ip_provider_code" text,
	"velocity_hits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matrix_row_id" uuid,
	"matrix_row_priority" integer,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "fraud_results_outcome_check" CHECK ("m08_fraud"."fraud_results"."outcome" in ('CLEAN', 'SUSPICIOUS', 'HIGH_FRAUD_POTENTIAL')),
	CONSTRAINT "fraud_results_ip_status_check" CHECK ("m08_fraud"."fraud_results"."ip_status" in ('NORMAL', 'VPN_PROXY', 'LOCATION_MISMATCH', 'NOT_APPLICABLE'))
);
--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "m08_fraud"."fraud_velocity_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"window_value" integer NOT NULL,
	"window_unit" text NOT NULL,
	"max_count" integer NOT NULL,
	"outcome_when_exceeded" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "fraud_velocity_rules_dimension_check" CHECK ("m08_fraud"."fraud_velocity_rules"."dimension" in ('FULL_NAME', 'ID_CARD_NUMBER', 'IP_ADDRESS', 'DEVICE_ID')),
	CONSTRAINT "fraud_velocity_rules_window_unit_check" CHECK ("m08_fraud"."fraud_velocity_rules"."window_unit" in ('DAY', 'HOUR')),
	CONSTRAINT "fraud_velocity_rules_window_value_check" CHECK ("m08_fraud"."fraud_velocity_rules"."window_value" >= 1),
	CONSTRAINT "fraud_velocity_rules_max_count_check" CHECK ("m08_fraud"."fraud_velocity_rules"."max_count" >= 1),
	CONSTRAINT "fraud_velocity_rules_outcome_check" CHECK ("m08_fraud"."fraud_velocity_rules"."outcome_when_exceeded" in ('CLEAN', 'SUSPICIOUS', 'HIGH_FRAUD_POTENTIAL'))
);
--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_velocity_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m08_fraud"."blacklists" ADD CONSTRAINT "blacklists_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."blacklists" ADD CONSTRAINT "blacklists_source_application_id_applications_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_matrix" ADD CONSTRAINT "fraud_matrix_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_results" ADD CONSTRAINT "fraud_results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_results" ADD CONSTRAINT "fraud_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_results" ADD CONSTRAINT "fraud_results_matrix_row_id_fraud_matrix_id_fk" FOREIGN KEY ("matrix_row_id") REFERENCES "m08_fraud"."fraud_matrix"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m08_fraud"."fraud_velocity_rules" ADD CONSTRAINT "fraud_velocity_rules_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blacklists_id_card_number_bidx_idx" ON "m08_fraud"."blacklists" USING btree ("tenant_id","id_card_number_bidx");--> statement-breakpoint
CREATE INDEX "fraud_matrix_priority_idx" ON "m08_fraud"."fraud_matrix" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "fraud_results_process_unique" ON "m08_fraud"."fraud_results" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "fraud_results_application_idx" ON "m08_fraud"."fraud_results" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m08_fraud"."blacklists" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m08_fraud"."fraud_matrix" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m08_fraud"."fraud_results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m08_fraud"."fraud_velocity_rules" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);