CREATE TABLE "platform"."tenant_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key_purpose" text NOT NULL,
	"wrapped_key" "bytea" NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "tenant_keys_tenant_purpose_version_unique" UNIQUE("tenant_id","key_purpose","key_version"),
	CONSTRAINT "tenant_keys_purpose_check" CHECK ("platform"."tenant_keys"."key_purpose" in ('ENCRYPTION', 'BLIND_INDEX')),
	CONSTRAINT "tenant_keys_status_check" CHECK ("platform"."tenant_keys"."status" in ('ACTIVE', 'RETIRED')),
	CONSTRAINT "tenant_keys_version_check" CHECK ("platform"."tenant_keys"."key_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "platform"."tenant_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_keys_active_unique" ON "platform"."tenant_keys" USING btree ("tenant_id","key_purpose") WHERE "platform"."tenant_keys"."status" = 'ACTIVE';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."tenant_keys" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);