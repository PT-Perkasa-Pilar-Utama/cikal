ALTER TABLE "orchestrator"."process_instances" ADD COLUMN "loan_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orchestrator"."process_instances" ADD COLUMN "finish_reason" text;--> statement-breakpoint
CREATE INDEX "process_instances_status_idx" ON "orchestrator"."process_instances" USING btree ("status");