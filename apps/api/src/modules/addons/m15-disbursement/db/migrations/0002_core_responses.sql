CREATE TABLE "m15_disbursement"."core_responses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"loan_id" text NOT NULL,
	"provider_code" text NOT NULL,
	"channel" text NOT NULL,
	"outcome" text NOT NULL,
	"core_loan_account" text,
	"cif" text,
	"disburse_date" date,
	"main_limit" text,
	"child_limit" text,
	"collateral_link" text,
	"collateral_detail" text,
	"failure_reason" text,
	"processing_status" text NOT NULL,
	"file_id" uuid,
	"entered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "core_responses_channel_check" CHECK ("m15_disbursement"."core_responses"."channel" in ('CALLBACK', 'FILE', 'POLLING', 'MANUAL')),
	CONSTRAINT "core_responses_outcome_check" CHECK ("m15_disbursement"."core_responses"."outcome" in ('SUKSES', 'GAGAL')),
	CONSTRAINT "core_responses_processing_status_check" CHECK ("m15_disbursement"."core_responses"."processing_status" in ('APPLIED', 'IGNORED_NOT_WAITING', 'DUPLICATE')),
	CONSTRAINT "core_responses_source_check" CHECK (("m15_disbursement"."core_responses"."channel" = 'MANUAL' and "m15_disbursement"."core_responses"."entered_by" is not null) or ("m15_disbursement"."core_responses"."channel" <> 'MANUAL' and "m15_disbursement"."core_responses"."file_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "m15_disbursement"."core_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."core_responses" ADD CONSTRAINT "core_responses_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."core_responses" ADD CONSTRAINT "core_responses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."core_responses" ADD CONSTRAINT "core_responses_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "document"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."core_responses" ADD CONSTRAINT "core_responses_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "core_responses_process_idx" ON "m15_disbursement"."core_responses" USING btree ("process_instance_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m15_disbursement"."core_responses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);