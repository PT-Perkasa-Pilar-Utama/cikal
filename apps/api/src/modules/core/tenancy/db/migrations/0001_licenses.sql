CREATE TABLE "tenancy"."licenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"license_number" text NOT NULL,
	"deployment_type" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"max_users" integer,
	"signature" "bytea" NOT NULL,
	"raw_document" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "licenses_license_number_unique" UNIQUE("license_number"),
	CONSTRAINT "licenses_deployment_type_check" CHECK ("tenancy"."licenses"."deployment_type" in ('SAAS', 'ON_PREMISE')),
	CONSTRAINT "licenses_status_check" CHECK ("tenancy"."licenses"."status" in ('ACTIVE', 'REVOKED')),
	CONSTRAINT "licenses_valid_range_check" CHECK ("tenancy"."licenses"."valid_from" <= "tenancy"."licenses"."valid_to")
);
--> statement-breakpoint
ALTER TABLE "tenancy"."licenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenancy"."module_entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"license_id" uuid NOT NULL,
	"module_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "module_entitlements_license_module_unique" UNIQUE("license_id","module_code"),
	CONSTRAINT "module_entitlements_module_code_check" CHECK ("tenancy"."module_entitlements"."module_code" in ('CORE', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'))
);
--> statement-breakpoint
ALTER TABLE "tenancy"."module_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenancy"."licenses" ADD CONSTRAINT "licenses_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancy"."module_entitlements" ADD CONSTRAINT "module_entitlements_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancy"."module_entitlements" ADD CONSTRAINT "module_entitlements_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "tenancy"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_active_unique" ON "tenancy"."licenses" USING btree ("tenant_id") WHERE "tenancy"."licenses"."status" = 'ACTIVE';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tenancy"."licenses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tenancy"."module_entitlements" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);