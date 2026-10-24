CREATE SCHEMA IF NOT EXISTS "m11_decision";
--> statement-breakpoint
CREATE TABLE "m11_decision"."decision_matrix" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"dedup_outcome" text NOT NULL,
	"dukcapil_outcome" text NOT NULL,
	"fraud_outcome" text NOT NULL,
	"rac_outcome" text NOT NULL,
	"scoring_outcome" text NOT NULL,
	"credit_bureau_outcome" text NOT NULL,
	"decision_outcome" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "decision_matrix_priority_check" CHECK ("m11_decision"."decision_matrix"."priority" >= 1),
	CONSTRAINT "decision_matrix_dedup_outcome_check" CHECK ("dedup_outcome" in ('MATCH', 'UNMATCH', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_dukcapil_outcome_check" CHECK ("dukcapil_outcome" in ('PASSED', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_fraud_outcome_check" CHECK ("fraud_outcome" in ('CLEAN', 'SUSPICIOUS_CLEARED', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_rac_outcome_check" CHECK ("rac_outcome" in ('PASS', 'FAIL', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_scoring_outcome_check" CHECK ("scoring_outcome" in ('PASS', 'REVIEW', 'FAIL', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_credit_bureau_outcome_check" CHECK ("credit_bureau_outcome" in ('COLLECT_1', 'COLLECT_2', 'COLLECT_3', 'COLLECT_4', 'COLLECT_5', 'NO_HISTORY', 'SKIP', 'ANY')),
	CONSTRAINT "decision_matrix_decision_outcome_check" CHECK ("decision_outcome" in ('GO', 'NOTGO'))
);
--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_matrix" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "m11_decision"."decision_matrix" ADD CONSTRAINT "decision_matrix_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decision_matrix_combination_unique" ON "m11_decision"."decision_matrix" USING btree ("tenant_id","dedup_outcome","dukcapil_outcome","fraud_outcome","rac_outcome","scoring_outcome","credit_bureau_outcome");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "m11_decision"."decision_matrix" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);