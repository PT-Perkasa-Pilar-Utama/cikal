ALTER TABLE "application"."applications" ADD COLUMN "tenor_approved" integer;--> statement-breakpoint
ALTER TABLE "application"."applications" ADD COLUMN "loan_amount" numeric(18, 2);--> statement-breakpoint
CREATE INDEX "applications_loan_id_trgm" ON "application"."applications" USING gin ("loan_id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "application_personals_full_name_trgm" ON "application"."application_personals" USING gin ("full_name" gin_trgm_ops);