CREATE SCHEMA IF NOT EXISTS "integration";
--> statement-breakpoint
CREATE TABLE "integration"."integration_call_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_code" text NOT NULL,
	"provider_code" text,
	"direction" text NOT NULL,
	"application_id" uuid,
	"loan_id" text,
	"step_execution_id" uuid,
	"correlation_id" text NOT NULL,
	"external_reference" text,
	"attempt" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error_category" text,
	"error_message" text,
	"request_masked" jsonb NOT NULL,
	"response_masked" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "integration_call_logs_direction_check" CHECK ("integration"."integration_call_logs"."direction" in ('OUTBOUND', 'INBOUND')),
	CONSTRAINT "integration_call_logs_status_check" CHECK ("integration"."integration_call_logs"."status" in ('SUCCESS', 'ERROR')),
	CONSTRAINT "integration_call_logs_category_check" CHECK ("integration"."integration_call_logs"."error_category" in ('TIMEOUT', 'CONNECTION', 'PROVIDER_ERROR', 'AUTH', 'CONFIG', 'INVALID_RESPONSE')),
	CONSTRAINT "integration_call_logs_attempt_check" CHECK ("integration"."integration_call_logs"."attempt" >= 1)
);
--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "integration"."integration_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_code" text NOT NULL,
	"provider_code" text NOT NULL,
	"mode" text NOT NULL,
	"endpoint_url" text,
	"timeout_seconds" integer DEFAULT 30 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"async_wait_hours" integer,
	"result_reuse_days" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"effective_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "integration_configs_mode_check" CHECK ("integration"."integration_configs"."mode" in ('SYNC', 'ASYNC', 'MANUAL')),
	CONSTRAINT "integration_configs_status_check" CHECK ("integration"."integration_configs"."status" in ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "integration_configs_timeout_check" CHECK ("integration"."integration_configs"."timeout_seconds" between 1 and 120),
	CONSTRAINT "integration_configs_max_retries_check" CHECK ("integration"."integration_configs"."max_retries" between 0 and 5),
	CONSTRAINT "integration_configs_async_wait_check" CHECK ("integration"."integration_configs"."async_wait_hours" between 1 and 720),
	CONSTRAINT "integration_configs_reuse_days_check" CHECK ("integration"."integration_configs"."result_reuse_days" between 0 and 90)
);
--> statement-breakpoint
ALTER TABLE "integration"."integration_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs" ADD CONSTRAINT "integration_call_logs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration"."integration_configs" ADD CONSTRAINT "integration_configs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_call_logs_application_idx" ON "integration"."integration_call_logs" USING btree ("application_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_configs_active_unique" ON "integration"."integration_configs" USING btree ("tenant_id","module_code") WHERE "integration"."integration_configs"."status" = 'ACTIVE' and "integration"."integration_configs"."module_code" <> 'M14';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "integration"."integration_call_logs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "integration"."integration_configs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);