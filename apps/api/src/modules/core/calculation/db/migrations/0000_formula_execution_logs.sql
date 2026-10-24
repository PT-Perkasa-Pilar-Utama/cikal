CREATE SCHEMA IF NOT EXISTS "calculation";
--> statement-breakpoint
CREATE TABLE "calculation"."formula_execution_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"formula_code" text NOT NULL,
	"formula_version_id" uuid,
	"application_id" uuid,
	"process_instance_id" uuid,
	"input_values" jsonb NOT NULL,
	"result" text,
	"status" text NOT NULL,
	"error_message" text,
	"executed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "formula_execution_logs_status_check" CHECK ("calculation"."formula_execution_logs"."status" in ('SUCCESS', 'ERROR'))
);
--> statement-breakpoint
ALTER TABLE "calculation"."formula_execution_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calculation"."formula_execution_logs" ADD CONSTRAINT "formula_execution_logs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "formula_execution_logs_application_idx" ON "calculation"."formula_execution_logs" USING btree ("application_id","executed_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "calculation"."formula_execution_logs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);