CREATE TABLE "application"."application_personals" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"full_name_id" text NOT NULL,
	"id_type" text NOT NULL,
	"id_card_number_enc" "bytea" NOT NULL,
	"id_card_number_key_version" integer NOT NULL,
	"id_card_number_bidx" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "application_personals_id_type_check" CHECK ("application"."application_personals"."id_type" in ('KTP'))
);
--> statement-breakpoint
ALTER TABLE "application"."application_personals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "application_type" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "segment" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "purpose_of_loan" text;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "tenor_proposed" integer;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "requested_limit" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "insurance_id" uuid;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "current_section" text DEFAULT 'application' NOT NULL;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD CONSTRAINT "application_personals_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application"."application_personals" ADD CONSTRAINT "application_personals_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_personals_id_card_number_bidx_idx" ON "application"."application_personals" USING btree ("tenant_id","id_card_number_bidx");--> statement-breakpoint
CREATE INDEX "applications_created_by_status_idx" ON "application"."applications" USING btree ("tenant_id","created_by","status");--> statement-breakpoint
ALTER TABLE "application"."applications" ADD CONSTRAINT "applications_current_section_check" CHECK ("application"."applications"."current_section" in ('application', 'personal', 'spouse', 'occupation', 'business', 'collateral', 'documents', 'emergency-contact'));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."application_personals" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);