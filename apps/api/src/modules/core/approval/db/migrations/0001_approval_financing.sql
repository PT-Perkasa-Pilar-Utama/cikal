CREATE TABLE "approval"."application_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"job_level" integer,
	"sub_level" integer,
	"description" text,
	"approver_user_id" uuid,
	"decision" text NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "application_approvals_sequence_unique" UNIQUE("process_instance_id","sequence"),
	CONSTRAINT "application_approvals_decision_check" CHECK ("approval"."application_approvals"."decision" in ('PENDING', 'APPROVE', 'REJECT', 'RETURN', 'AUTO_APPROVED')),
	CONSTRAINT "application_approvals_level_check" CHECK (("approval"."application_approvals"."decision" = 'AUTO_APPROVED') = ("approval"."application_approvals"."job_level" is null and "approval"."application_approvals"."approver_user_id" is null)),
	CONSTRAINT "application_approvals_comment_check" CHECK (char_length("approval"."application_approvals"."comment") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "approval"."application_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval"."financings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"approval_type" text NOT NULL,
	"loan_amount" numeric(18, 2) NOT NULL,
	"tenor" integer NOT NULL,
	"interest_type" text NOT NULL,
	"interest_rate" numeric(9, 4) NOT NULL,
	"floating_rate" numeric(9, 4),
	"cap_rate" numeric(9, 4),
	"tenor_fixed" integer,
	"admin_fee" numeric(18, 2) NOT NULL,
	"sales_fee" numeric(18, 2),
	"provision_fee" numeric(18, 2) NOT NULL,
	"insurance_value" numeric(18, 2) NOT NULL,
	"net_disbursement" numeric(18, 2) NOT NULL,
	"monthly_installment" numeric(18, 2) NOT NULL,
	"dbr_ratio" numeric(9, 4),
	"dsr_ratio" numeric(9, 4),
	"formula_versions" jsonb NOT NULL,
	"first_installment_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "financings_application_unique" UNIQUE("application_id"),
	CONSTRAINT "financings_approval_type_check" CHECK ("approval"."financings"."approval_type" in ('AUTO', 'MANUAL'))
);
--> statement-breakpoint
ALTER TABLE "approval"."financings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval"."installments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"financing_id" uuid NOT NULL,
	"installment_no" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_amount" numeric(18, 2) NOT NULL,
	"interest_amount" numeric(18, 2) NOT NULL,
	"outstanding_amount" numeric(18, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "installments_number_unique" UNIQUE("financing_id","installment_no")
);
--> statement-breakpoint
ALTER TABLE "approval"."installments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approval"."application_approvals" ADD CONSTRAINT "application_approvals_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."application_approvals" ADD CONSTRAINT "application_approvals_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."application_approvals" ADD CONSTRAINT "application_approvals_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "iam"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."financings" ADD CONSTRAINT "financings_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."financings" ADD CONSTRAINT "financings_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."installments" ADD CONSTRAINT "installments_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval"."installments" ADD CONSTRAINT "installments_financing_id_financings_id_fk" FOREIGN KEY ("financing_id") REFERENCES "approval"."financings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_approvals_application_idx" ON "approval"."application_approvals" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "approval"."application_approvals" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "approval"."financings" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "approval"."installments" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);