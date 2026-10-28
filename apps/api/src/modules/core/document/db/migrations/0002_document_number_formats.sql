CREATE TABLE "document"."document_number_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"format_id" uuid NOT NULL,
	"scope_key" text NOT NULL,
	"period_key" text NOT NULL,
	"last_number" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_number_counters_key_unique" UNIQUE("format_id","scope_key","period_key"),
	CONSTRAINT "document_number_counters_last_number_check" CHECK ("document"."document_number_counters"."last_number" >= 0)
);
--> statement-breakpoint
ALTER TABLE "document"."document_number_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document"."document_number_formats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"pattern" text NOT NULL,
	"reset_period" text NOT NULL,
	"counter_scope" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"effective_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_number_formats_version_unique" UNIQUE("tenant_id","document_type","version_number"),
	CONSTRAINT "document_number_formats_document_type_check" CHECK ("document"."document_number_formats"."document_type" in ('SP3K', 'CONTRACT')),
	CONSTRAINT "document_number_formats_reset_period_check" CHECK ("document"."document_number_formats"."reset_period" in ('NONE', 'YEARLY', 'MONTHLY', 'DAILY')),
	CONSTRAINT "document_number_formats_counter_scope_check" CHECK ("document"."document_number_formats"."counter_scope" in ('COMPANY', 'BRANCH', 'PRODUCT', 'BRANCH_PRODUCT')),
	CONSTRAINT "document_number_formats_status_check" CHECK ("document"."document_number_formats"."status" in ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "document_number_formats_version_number_check" CHECK ("document"."document_number_formats"."version_number" >= 1),
	CONSTRAINT "document_number_formats_effective_from_check" CHECK ("document"."document_number_formats"."status" <> 'ACTIVE' or "document"."document_number_formats"."effective_from" is not null)
);
--> statement-breakpoint
ALTER TABLE "document"."document_number_formats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "document"."document_number_counters" ADD CONSTRAINT "document_number_counters_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document"."document_number_counters" ADD CONSTRAINT "document_number_counters_format_id_document_number_formats_id_fk" FOREIGN KEY ("format_id") REFERENCES "document"."document_number_formats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document"."document_number_formats" ADD CONSTRAINT "document_number_formats_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_number_formats_active_unique" ON "document"."document_number_formats" USING btree ("tenant_id","document_type") WHERE "document"."document_number_formats"."status" = 'ACTIVE';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document"."document_number_counters" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document"."document_number_formats" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);