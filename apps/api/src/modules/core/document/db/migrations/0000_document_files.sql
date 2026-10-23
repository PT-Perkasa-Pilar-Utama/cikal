CREATE SCHEMA IF NOT EXISTS "document";
--> statement-breakpoint
CREATE TABLE "document"."document_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"original_extension" text NOT NULL,
	"stored_format" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_files_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "document_files_original_extension_check" CHECK ("document"."document_files"."original_extension" in ('png', 'jpg', 'jpeg', 'pdf', 'docx')),
	CONSTRAINT "document_files_stored_format_check" CHECK ("document"."document_files"."stored_format" = 'PDF'),
	CONSTRAINT "document_files_size_bytes_check" CHECK ("document"."document_files"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "document"."document_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document"."document_files" ADD CONSTRAINT "document_files_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document"."document_files" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);