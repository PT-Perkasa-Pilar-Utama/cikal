CREATE TABLE "application"."loan_id_counters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_code" text NOT NULL,
	"last_number" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "loan_id_counters_tenant_product_code_unique" UNIQUE("tenant_id","product_code"),
	CONSTRAINT "loan_id_counters_last_number_check" CHECK ("application"."loan_id_counters"."last_number" between 1 and 9999999)
);
--> statement-breakpoint
ALTER TABLE "application"."loan_id_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "application"."loan_id_counters" ADD CONSTRAINT "loan_id_counters_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "application"."loan_id_counters" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);