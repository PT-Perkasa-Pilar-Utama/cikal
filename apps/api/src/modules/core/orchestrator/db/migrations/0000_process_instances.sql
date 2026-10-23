CREATE SCHEMA IF NOT EXISTS "orchestrator";
--> statement-breakpoint
CREATE TABLE "orchestrator"."process_instances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"recontest_number" integer NOT NULL,
	"route_version_id" uuid NOT NULL,
	"formula_versions" jsonb NOT NULL,
	"parameter_snapshot" jsonb NOT NULL,
	"status" text NOT NULL,
	"recontest_reason" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "process_instances_status_check" CHECK ("orchestrator"."process_instances"."status" in ('RUNNING', 'WAITING', 'COMPLETED', 'CANCELLED')),
	CONSTRAINT "process_instances_recontest_number_check" CHECK ("orchestrator"."process_instances"."recontest_number" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orchestrator"."process_instances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orchestrator"."step_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"step_code" text NOT NULL,
	"status" text NOT NULL,
	"outcome_code" text,
	"result_type" text,
	"external_reference" text,
	"wait_deadline" timestamp with time zone,
	"error_category" text,
	"error_message" text,
	"reused_from_step_execution_id" uuid,
	"skip_reason" text,
	"attempt" integer NOT NULL,
	"actor_user_id" uuid,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"aging" numeric(10, 2),
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "step_executions_process_step_attempt_unique" UNIQUE("process_instance_id","step_code","attempt"),
	CONSTRAINT "step_executions_step_code_check" CHECK ("orchestrator"."step_executions"."step_code" in ('DATA_ENTRY', 'SURVEY', 'DEDUP', 'DUKCAPIL', 'NAME_SCREENING', 'VERIFICATION', 'FRAUD', 'RAC', 'SCORING', 'CREDIT_BUREAU', 'DECISION', 'SIKP', 'APPROVAL', 'EPOLIS', 'VALIDITY_CHECK', 'PRINT_AKAD', 'DISBURSEMENT', 'WAIT_CORE')),
	CONSTRAINT "step_executions_status_check" CHECK ("orchestrator"."step_executions"."status" in ('PENDING', 'RUNNING', 'WAITING_HUMAN', 'WAITING_EXTERNAL', 'COMPLETED', 'SKIPPED', 'ERROR')),
	CONSTRAINT "step_executions_result_type_check" CHECK ("orchestrator"."step_executions"."result_type" in ('CONTINUE', 'WAIT_HUMAN', 'WAIT_EXTERNAL', 'BACK_TO_DRAFT', 'RECONTEST', 'FINISH', 'ERROR')),
	CONSTRAINT "step_executions_skip_reason_check" CHECK ("orchestrator"."step_executions"."skip_reason" in ('NOT_IN_ROUTE', 'NOT_LICENSED', 'CONDITION_NOT_MET', 'DEDUP_MATCH')),
	CONSTRAINT "step_executions_error_category_check" CHECK ("orchestrator"."step_executions"."error_category" in ('TIMEOUT', 'CONNECTION', 'PROVIDER_ERROR', 'AUTH', 'CONFIG', 'INVALID_RESPONSE', 'CONSENT_MISSING', 'FORMULA', 'BUSINESS_SETUP')),
	CONSTRAINT "step_executions_attempt_check" CHECK ("orchestrator"."step_executions"."attempt" >= 1),
	CONSTRAINT "step_executions_skipped_reason_check" CHECK (("orchestrator"."step_executions"."status" = 'SKIPPED') = ("orchestrator"."step_executions"."skip_reason" is not null))
);
--> statement-breakpoint
ALTER TABLE "orchestrator"."step_executions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orchestrator"."process_instances" ADD CONSTRAINT "process_instances_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator"."process_instances" ADD CONSTRAINT "process_instances_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator"."process_instances" ADD CONSTRAINT "process_instances_route_version_id_product_route_versions_id_fk" FOREIGN KEY ("route_version_id") REFERENCES "product"."product_route_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator"."step_executions" ADD CONSTRAINT "step_executions_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator"."step_executions" ADD CONSTRAINT "step_executions_process_instance_id_process_instances_id_fk" FOREIGN KEY ("process_instance_id") REFERENCES "orchestrator"."process_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator"."step_executions" ADD CONSTRAINT "step_executions_reused_from_step_execution_id_step_executions_id_fk" FOREIGN KEY ("reused_from_step_execution_id") REFERENCES "orchestrator"."step_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_instances_application_id_idx" ON "orchestrator"."process_instances" USING btree ("application_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "process_instances_active_unique" ON "orchestrator"."process_instances" USING btree ("application_id") WHERE "orchestrator"."process_instances"."status" in ('RUNNING', 'WAITING');--> statement-breakpoint
CREATE INDEX "step_executions_external_reference_idx" ON "orchestrator"."step_executions" USING btree ("external_reference");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "orchestrator"."process_instances" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "orchestrator"."step_executions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);