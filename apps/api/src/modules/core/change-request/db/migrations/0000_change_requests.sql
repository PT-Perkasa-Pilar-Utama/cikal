CREATE SCHEMA IF NOT EXISTS "cr";
--> statement-breakpoint
CREATE TABLE "cr"."change_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb NOT NULL,
	"package_size" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'WAITING_APPROVAL' NOT NULL,
	"revise_reason" text,
	"submitted_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "change_requests_entity_type_check" CHECK ("cr"."change_requests"."entity_type" in ('ROLE_ACCESS', 'PRODUCT', 'PRODUCT_PRICING', 'ROUTE', 'DOCUMENT_CHECKLIST', 'APPROVAL_HIERARCHY', 'SCORING_MODEL', 'DECISION_MATRIX', 'DOCUMENT_NUMBER_FORMAT', 'INTEGRATION_CONFIG')),
	CONSTRAINT "change_requests_action_check" CHECK ("cr"."change_requests"."action" in ('CREATE', 'UPDATE')),
	CONSTRAINT "change_requests_status_check" CHECK ("cr"."change_requests"."status" in ('WAITING_APPROVAL', 'REVISE', 'APPROVED', 'REJECTED')),
	CONSTRAINT "change_requests_package_size_check" CHECK ("cr"."change_requests"."package_size" >= 1),
	CONSTRAINT "change_requests_revise_reason_check" CHECK (char_length("cr"."change_requests"."revise_reason") <= 500),
	CONSTRAINT "change_requests_self_review_check" CHECK ("cr"."change_requests"."reviewed_by" <> "cr"."change_requests"."submitted_by")
);
--> statement-breakpoint
ALTER TABLE "cr"."change_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cr"."change_requests" ADD CONSTRAINT "change_requests_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cr"."change_requests" ADD CONSTRAINT "change_requests_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cr"."change_requests" ADD CONSTRAINT "change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "change_requests_open_entity_unique" ON "cr"."change_requests" USING btree ("tenant_id","entity_type","entity_id") WHERE "cr"."change_requests"."status" in ('WAITING_APPROVAL', 'REVISE');--> statement-breakpoint
CREATE INDEX "change_requests_pending_list_idx" ON "cr"."change_requests" USING btree ("tenant_id","entity_type","status","created_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "cr"."change_requests" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);