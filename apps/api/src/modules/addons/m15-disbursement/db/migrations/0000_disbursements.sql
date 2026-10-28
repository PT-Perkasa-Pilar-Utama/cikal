CREATE SCHEMA IF NOT EXISTS "m15_disbursement";
--> statement-breakpoint
CREATE TABLE "m15_disbursement"."disbursements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"disbursement_amount" numeric(18, 2) NOT NULL,
	"bank_account_number_enc" "bytea",
	"disbursement_date" date,
	"validity_status" text,
	"not_valid_reason" text,
	"contract_number" text,
	"contract_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "disbursements_application_unique" UNIQUE("application_id"),
	CONSTRAINT "disbursements_validity_status_check" CHECK ("m15_disbursement"."disbursements"."validity_status" in ('VALID', 'NOT_VALID')),
	CONSTRAINT "disbursements_valid_date_check" CHECK ("m15_disbursement"."disbursements"."validity_status" is distinct from 'VALID' or "m15_disbursement"."disbursements"."disbursement_date" is not null),
	CONSTRAINT "disbursements_not_valid_reason_check" CHECK ("m15_disbursement"."disbursements"."validity_status" is distinct from 'NOT_VALID' or "m15_disbursement"."disbursements"."not_valid_reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "m15_disbursement"."disbursements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."disbursements" ADD CONSTRAINT "disbursements_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."disbursements" ADD CONSTRAINT "disbursements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m15_disbursement"."disbursements" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);