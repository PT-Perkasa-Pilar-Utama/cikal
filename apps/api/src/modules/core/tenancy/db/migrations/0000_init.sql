CREATE SCHEMA IF NOT EXISTS "tenancy";
--> statement-breakpoint
CREATE TABLE "tenancy"."companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_code" text NOT NULL,
	"company_name" text NOT NULL,
	"platform_code" text DEFAULT '01' NOT NULL,
	"address" text NOT NULL,
	"sso_config" jsonb,
	"api_signing_key_ref" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "companies_company_code_unique" UNIQUE("company_code"),
	CONSTRAINT "companies_company_code_check" CHECK ("tenancy"."companies"."company_code" ~ '^[0-9]{3}$'),
	CONSTRAINT "companies_company_name_check" CHECK (char_length("tenancy"."companies"."company_name") <= 100),
	CONSTRAINT "companies_platform_code_check" CHECK ("tenancy"."companies"."platform_code" in ('01', '02')),
	CONSTRAINT "companies_address_check" CHECK (char_length("tenancy"."companies"."address") <= 500)
);
