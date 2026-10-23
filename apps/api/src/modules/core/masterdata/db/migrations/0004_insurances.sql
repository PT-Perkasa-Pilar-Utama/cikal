CREATE TABLE "masterdata"."insurances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"insurance_code" text NOT NULL,
	"insurance_name" text NOT NULL,
	"provider_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "masterdata"."insurances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "masterdata"."insurances" ADD CONSTRAINT "insurances_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "insurances_tenant_insurance_code_unique" ON "masterdata"."insurances" USING btree ("tenant_id","insurance_code");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "masterdata"."insurances" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);