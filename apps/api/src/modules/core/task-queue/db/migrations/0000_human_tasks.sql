CREATE SCHEMA IF NOT EXISTS "taskqueue";
--> statement-breakpoint
CREATE TABLE "taskqueue"."human_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"step_execution_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"loan_id" text NOT NULL,
	"queue_code" text NOT NULL,
	"branch_id" uuid,
	"eligible_role_id" uuid,
	"assigned_user_id" uuid,
	"assigned_at" timestamp with time zone,
	"status" text NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"result_code" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "human_tasks_queue_code_check" CHECK ("taskqueue"."human_tasks"."queue_code" in ('VERIFICATION', 'CREDIT_REPORT_UPLOAD', 'APPROVAL', 'VALIDITY_CHECK', 'PRINT_AKAD', 'DISBURSEMENT', 'PROCESS_ERROR', 'PRESCREEN_DEDUP', 'PRESCREEN_DUKCAPIL_L1', 'PRESCREEN_FRAUD', 'PRESCREEN_DUKCAPIL_L2', 'RECONTEST')),
	CONSTRAINT "human_tasks_status_check" CHECK ("taskqueue"."human_tasks"."status" in ('OPEN', 'ASSIGNED', 'CLOSED')),
	CONSTRAINT "human_tasks_assignee_check" CHECK (("taskqueue"."human_tasks"."status" = 'OPEN') = ("taskqueue"."human_tasks"."assigned_user_id" is null)),
	CONSTRAINT "human_tasks_closed_check" CHECK (("taskqueue"."human_tasks"."status" = 'CLOSED') = ("taskqueue"."human_tasks"."closed_at" is not null)),
	CONSTRAINT "human_tasks_version_check" CHECK ("taskqueue"."human_tasks"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_step_execution_id_step_executions_id_fk" FOREIGN KEY ("step_execution_id") REFERENCES "orchestrator"."step_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_eligible_role_id_roles_id_fk" FOREIGN KEY ("eligible_role_id") REFERENCES "iam"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taskqueue"."human_tasks" ADD CONSTRAINT "human_tasks_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "human_tasks_queue_status_idx" ON "taskqueue"."human_tasks" USING btree ("queue_code","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "human_tasks_open_step_unique" ON "taskqueue"."human_tasks" USING btree ("step_execution_id") WHERE "taskqueue"."human_tasks"."status" <> 'CLOSED';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "taskqueue"."human_tasks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);