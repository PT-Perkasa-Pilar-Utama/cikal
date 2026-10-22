CREATE SCHEMA IF NOT EXISTS "audit";
--> statement-breakpoint
CREATE TABLE "audit"."audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"role" text,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"record_id" text,
	"description" text,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" "inet",
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "audit_logs_action_check" CHECK ("audit"."audit_logs"."action" in ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'REVISE', 'RESUBMIT', 'ASSIGN', 'RELEASE', 'PRINT', 'REPRINT', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'VIEW_APPLICATION'))
);
--> statement-breakpoint
ALTER TABLE "audit"."audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_module_occurred_at_idx" ON "audit"."audit_logs" USING btree ("tenant_id","module","occurred_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "audit"."audit_logs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);