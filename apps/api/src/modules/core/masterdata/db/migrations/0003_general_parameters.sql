CREATE TABLE "masterdata"."general_parameters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"param_type" text NOT NULL,
	"param_id" text NOT NULL,
	"param_value" text NOT NULL,
	"bi_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "general_parameters_param_value_check" CHECK (char_length("masterdata"."general_parameters"."param_value") <= 100)
);
--> statement-breakpoint
ALTER TABLE "masterdata"."general_parameters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "masterdata"."general_parameters" ADD CONSTRAINT "general_parameters_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "general_parameters_param_id_unique" ON "masterdata"."general_parameters" USING btree ("tenant_id","param_type","param_id");--> statement-breakpoint
CREATE UNIQUE INDEX "general_parameters_param_value_unique" ON "masterdata"."general_parameters" USING btree ("tenant_id","param_type",lower("param_value"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "masterdata"."general_parameters" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);