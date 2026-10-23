CREATE TABLE "application"."application_addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"address_type" text NOT NULL,
	"address" text,
	"rt" text,
	"rw" text,
	"province_code" text,
	"city_code" text,
	"district_code" text,
	"sub_district_code" text,
	"zip_code" text,
	"same_as_id" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "application_addresses_application_type_unique" UNIQUE("application_id","address_type"),
	CONSTRAINT "application_addresses_address_type_check" CHECK ("application"."application_addresses"."address_type" in ('ID', 'RESIDENCE', 'CORRESPONDENCE'))
);
--> statement-breakpoint
ALTER TABLE "application"."application_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application"."application_emergency_contacts" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_name" text,
	"relation_to_applicant" text,
	"mobile_number" text,
	"home_phone_number" text,
	"alt_phone_number" text,
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
ALTER TABLE "application"."application_emergency_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application"."application_occupations" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_of_income" text,
	"occupation" text,
	"industry_of_profession" text,
	"position" text,
	"tenure_at_current_job" numeric(5, 1),
	"monthly_income_allowance" numeric(18, 2),
	"organization" text,
	"previous_employer" text,
	"pension_instance" text,
	"company_name" text,
	"company_address" text,
	"company_province_code" text,
	"company_city_code" text,
	"company_district_code" text,
	"company_sub_district_code" text,
	"company_zip_code" text,
	"company_phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "application"."application_occupations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "place_of_birth" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "religion" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "education" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "marital" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "mother_maiden_name_enc" "bytea";--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "mother_maiden_name_key_version" integer;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "id_issued_date" date;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "id_expired_date" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "npwp_number_enc" "bytea";--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "npwp_number_key_version" integer;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "kk_number_enc" "bytea";--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "kk_number_key_version" integer;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "mobile_number" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "source_code" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "sales_code" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "marketing_code" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "consent_channel" text;--> statement-breakpoint
ALTER TABLE "application"."application_addresses" ADD CONSTRAINT "application_addresses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_addresses" ADD CONSTRAINT "application_addresses_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_emergency_contacts" ADD CONSTRAINT "application_emergency_contacts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_emergency_contacts" ADD CONSTRAINT "application_emergency_contacts_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_occupations" ADD CONSTRAINT "application_occupations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_occupations" ADD CONSTRAINT "application_occupations_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_insurance_id_insurances_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "masterdata"."insurances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_consent_channel_check" CHECK ("application"."applications"."consent_channel" in ('WEB', 'MOBILE', 'API'));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_addresses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_emergency_contacts" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_occupations" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);