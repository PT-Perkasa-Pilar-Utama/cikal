CREATE TABLE "document"."document_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_code" text NOT NULL,
	"product_id" uuid,
	"file_id" uuid NOT NULL,
	"placeholders" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_templates_code_product_unique" UNIQUE NULLS NOT DISTINCT("tenant_id","document_code","product_id")
);
--> statement-breakpoint
ALTER TABLE "document"."document_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document"."document_files" DROP CONSTRAINT "document_files_stored_format_check";--> statement-breakpoint
ALTER TABLE "document"."document_templates" ADD CONSTRAINT "document_templates_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document"."document_templates" ADD CONSTRAINT "document_templates_file_id_document_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "document"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document"."document_files" ADD CONSTRAINT "document_files_stored_format_check" CHECK ("document"."document_files"."stored_format" in ('PDF', 'DOCX'));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document"."document_templates" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);