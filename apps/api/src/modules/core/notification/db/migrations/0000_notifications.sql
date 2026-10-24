CREATE SCHEMA IF NOT EXISTS "notification";
--> statement-breakpoint
CREATE TABLE "notification"."email_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_code" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "notification"."email_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification"."notification_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"application_id" uuid,
	"template_code" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "notification_logs_status_check" CHECK ("notification"."notification_logs"."status" in ('SENT', 'FAILED', 'SKIPPED'))
);
--> statement-breakpoint
ALTER TABLE "notification"."notification_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification"."email_templates" ADD CONSTRAINT "email_templates_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification"."notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification"."notification_logs" ADD CONSTRAINT "notification_logs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_templates_tenant_template_code_unique" ON "notification"."email_templates" USING btree ("tenant_id","template_code");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_logs_event_template_unique" ON "notification"."notification_logs" USING btree ("tenant_id","event_id","template_code");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification"."email_templates" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification"."notification_logs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);