CREATE TABLE "application"."application_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"file_id" uuid,
	"verification_status" text DEFAULT 'PENDING' NOT NULL,
	"verification_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "application_documents_application_type_unique" UNIQUE("application_id","document_type"),
	CONSTRAINT "application_documents_verification_status_check" CHECK ("application"."application_documents"."verification_status" in ('PENDING', 'MATCH', 'NOT_MATCH'))
);
--> statement-breakpoint
ALTER TABLE "application"."application_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_documents" ADD CONSTRAINT "application_documents_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_documents" ADD CONSTRAINT "application_documents_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "document"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_documents_file_id_idx" ON "application"."application_documents" USING btree ("file_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_documents" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);