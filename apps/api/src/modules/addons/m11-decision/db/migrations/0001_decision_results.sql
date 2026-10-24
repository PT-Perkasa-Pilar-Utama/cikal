CREATE TABLE "m11_decision"."decision_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"process_instance_id" uuid NOT NULL,
	"outcomes" jsonb NOT NULL,
	"decision_outcome" text NOT NULL,
	"matrix_row_id" uuid,
	"matrix_row_priority" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "decision_results_decision_outcome_check" CHECK ("m11_decision"."decision_results"."decision_outcome" in ('GO', 'NOTGO'))
);
--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_results" ADD CONSTRAINT "decision_results_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_results" ADD CONSTRAINT "decision_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "application"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_results" ADD CONSTRAINT "decision_results_matrix_row_id_decision_matrix_id_fk" FOREIGN KEY ("matrix_row_id") REFERENCES "m11_decision"."decision_matrix"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decision_results_process_unique" ON "m11_decision"."decision_results" USING btree ("process_instance_id");--> statement-breakpoint
CREATE INDEX "decision_results_application_idx" ON "m11_decision"."decision_results" USING btree ("application_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m11_decision"."decision_results" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);