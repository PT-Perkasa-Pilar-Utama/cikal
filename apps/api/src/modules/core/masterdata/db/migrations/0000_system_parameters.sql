CREATE SCHEMA IF NOT EXISTS "masterdata";
--> statement-breakpoint
CREATE TABLE "masterdata"."system_parameter_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"param_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"module_code" text NOT NULL,
	"category" text NOT NULL,
	"value_type" text NOT NULL,
	"allowed_values" jsonb,
	"min_value" numeric,
	"max_value" numeric,
	"default_value" text,
	"scope" text NOT NULL,
	"lock_on_submit" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "system_parameter_definitions_param_key_unique" UNIQUE("param_key"),
	CONSTRAINT "system_parameter_definitions_category_check" CHECK ("masterdata"."system_parameter_definitions"."category" in ('BUSINESS', 'SECURITY', 'INTEGRATION', 'DISPLAY')),
	CONSTRAINT "system_parameter_definitions_value_type_check" CHECK ("masterdata"."system_parameter_definitions"."value_type" in ('NUMBER', 'MONEY', 'PERCENT', 'TEXT', 'BOOLEAN', 'CHOICE', 'MULTI_CHOICE', 'SECRET')),
	CONSTRAINT "system_parameter_definitions_scope_check" CHECK ("masterdata"."system_parameter_definitions"."scope" in ('INSTALLATION', 'TENANT', 'PRODUCT'))
);
--> statement-breakpoint
CREATE TABLE "masterdata"."system_parameter_values" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"product_id" uuid,
	"value" text,
	"secret_ref" uuid,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"change_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "system_parameter_values_status_check" CHECK ("masterdata"."system_parameter_values"."status" in ('WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "system_parameter_values_version_number_check" CHECK ("masterdata"."system_parameter_values"."version_number" >= 1)
);
--> statement-breakpoint
ALTER TABLE "masterdata"."system_parameter_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "masterdata"."system_parameter_values" ADD CONSTRAINT "system_parameter_values_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "masterdata"."system_parameter_values" ADD CONSTRAINT "system_parameter_values_definition_id_system_parameter_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "masterdata"."system_parameter_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "masterdata"."system_parameter_values" ADD CONSTRAINT "system_parameter_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "masterdata"."system_parameter_values" ADD CONSTRAINT "system_parameter_values_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "cr"."change_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "system_parameter_values_active_unique" ON "masterdata"."system_parameter_values" USING btree ("tenant_id","definition_id",coalesce("product_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "masterdata"."system_parameter_values"."status" = 'ACTIVE';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "masterdata"."system_parameter_values" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);