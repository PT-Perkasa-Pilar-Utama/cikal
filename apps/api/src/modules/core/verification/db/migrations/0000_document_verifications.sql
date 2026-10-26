CREATE SCHEMA IF NOT EXISTS "verification";
--> statement-breakpoint
CREATE TABLE "verification"."document_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"verifier_user_id" uuid,
	"result" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_verifications_result_check" CHECK ("verification"."document_verifications"."result" in ('IN_PROGRESS', 'ALL_MATCH', 'HAS_NOT_MATCH'))
);
--> statement-breakpoint
ALTER TABLE "verification"."document_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification"."document_verifications" ADD CONSTRAINT "document_verifications_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification"."document_verifications" ADD CONSTRAINT "document_verifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification"."document_verifications" ADD CONSTRAINT "document_verifications_verifier_user_id_users_id_fk" FOREIGN KEY ("verifier_user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_verifications_process_unique" ON "verification"."document_verifications" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "document_verifications_application_idx" ON "verification"."document_verifications" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "verification"."document_verifications" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);