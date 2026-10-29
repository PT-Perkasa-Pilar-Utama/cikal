CREATE TABLE "m15_disbursement"."akad_prints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"payment_method" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"customer_account_number_enc" "bytea" NOT NULL,
	"customer_account_number_key_version" integer NOT NULL,
	"risk_manager_user_id" uuid NOT NULL,
	"generated_document_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"print_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "akad_prints_application_unique" UNIQUE("application_id"),
	CONSTRAINT "akad_prints_print_count_check" CHECK ("m15_disbursement"."akad_prints"."print_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."disbursements" ADD COLUMN "bank_account_number_key_version" integer;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ADD CONSTRAINT "akad_prints_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ADD CONSTRAINT "akad_prints_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ADD CONSTRAINT "akad_prints_risk_manager_user_id_users_id_fk" FOREIGN KEY ("risk_manager_user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ADD CONSTRAINT "akad_prints_generated_document_id_generated_documents_id_fk" FOREIGN KEY ("generated_document_id") REFERENCES "document"."generated_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m15_disbursement"."akad_prints" ADD CONSTRAINT "akad_prints_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "document"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m15_disbursement"."akad_prints" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);