CREATE TABLE "document"."generated_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"document_code" text NOT NULL,
	"document_number" text,
	"file_id" uuid NOT NULL,
	"is_reprint" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "document"."generated_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document"."generated_documents" ADD CONSTRAINT "generated_documents_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document"."generated_documents" ADD CONSTRAINT "generated_documents_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "document"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document"."generated_documents" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);