CREATE TABLE "application"."application_businesses" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_name" text,
	"business_field" text,
	"phone_number" text,
	"email" text,
	"annual_sales" numeric(18, 2),
	"business_number" text,
	"business_launch_date" date,
	"characteristic_of_financing" text,
	"type_of_financing" text,
	"type_of_usage" text,
	"category_of_financing" text,
	"relationship_with_bank" text,
	"address" text,
	"rt" text,
	"rw" text,
	"province_code" text,
	"city_code" text,
	"district_code" text,
	"sub_district_code" text,
	"zip_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "application"."application_businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application"."application_collaterals" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"collateral_type" text,
	"vehicle_type" text,
	"vehicle_brand" text,
	"vehicle_model" text,
	"description" text,
	"vehicle_year" integer,
	"vehicle_price" numeric(18, 2),
	"vehicle_color" text,
	"machine_number" text,
	"frame_number" text,
	"bpkb_number" text,
	"bpkb_owner_occupation" text,
	"police_number" text,
	"certificate_type" text,
	"certificate_number_enc" "bytea",
	"certificate_number_key_version" integer,
	"surface_area" numeric(12, 2),
	"decree_number" text,
	"decree_date" date,
	"address" text,
	"rt" text,
	"rw" text,
	"province_code" text,
	"city_code" text,
	"district_code" text,
	"sub_district_code" text,
	"zip_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "application_collaterals_collateral_type_check" CHECK ("application"."application_collaterals"."collateral_type" in ('VEHICLE', 'CERTIFICATE', 'PENSION_DECREE'))
);
--> statement-breakpoint
ALTER TABLE "application"."application_collaterals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application"."application_spouses" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text,
	"id_number_enc" "bytea",
	"id_number_key_version" integer,
	"id_number_bidx" "bytea",
	"date_of_birth" date,
	"mobile_number" text,
	"prenuptial_agreement" text,
	"id_expired_date" text,
	"id_address" text,
	"id_rt" text,
	"id_rw" text,
	"id_province_code" text,
	"id_city_code" text,
	"id_district_code" text,
	"id_sub_district_code" text,
	"id_zip_code" text,
	"occupation" text,
	"industry_of_profession" text,
	"position" text,
	"source_of_funds" text,
	"monthly_income" numeric(18, 2),
	"monthly_spending" numeric(18, 2),
	"company_name" text,
	"company_address" text,
	"company_province_code" text,
	"company_city_code" text,
	"company_phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "application"."application_spouses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."application_businesses" ADD CONSTRAINT "application_businesses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_businesses" ADD CONSTRAINT "application_businesses_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_collaterals" ADD CONSTRAINT "application_collaterals_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_collaterals" ADD CONSTRAINT "application_collaterals_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_spouses" ADD CONSTRAINT "application_spouses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_spouses" ADD CONSTRAINT "application_spouses_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_spouses_id_number_bidx_idx" ON "application"."application_spouses" USING btree ("tenant_id","id_number_bidx");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_businesses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_collaterals" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_spouses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);