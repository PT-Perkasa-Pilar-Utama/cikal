ALTER TABLE "integration"."integration_call_logs" DROP CONSTRAINT "integration_call_logs_pkey";--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs" ADD CONSTRAINT "integration_call_logs_id_started_at_pk" PRIMARY KEY("id","started_at");
