CREATE TABLE "iam"."login_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" "inet" NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD COLUMN "ended_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_user_channel_live_unique" ON "iam"."sessions" USING btree ("user_id","channel") WHERE "iam"."sessions"."ended_reason" is null;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_ended_reason_check" CHECK ("iam"."sessions"."ended_reason" in ('REPLACED'));--> statement-breakpoint
CREATE POLICY "login_lookup" ON "iam"."users" AS PERMISSIVE FOR SELECT TO public USING (lower("iam"."users"."username") = nullif(current_setting('app.login_username', true), ''));