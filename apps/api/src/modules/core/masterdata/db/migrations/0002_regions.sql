CREATE TABLE "masterdata"."cities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"city_code" text NOT NULL,
	"city_name" text NOT NULL,
	"province_code" text NOT NULL,
	"last_sync_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "cities_city_code_unique" UNIQUE("city_code")
);
--> statement-breakpoint
CREATE TABLE "masterdata"."districts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"district_code" text NOT NULL,
	"district_name" text NOT NULL,
	"city_code" text NOT NULL,
	"last_sync_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "districts_district_code_unique" UNIQUE("district_code")
);
--> statement-breakpoint
CREATE TABLE "masterdata"."provinces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"province_code" text NOT NULL,
	"province_name" text NOT NULL,
	"last_sync_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "provinces_province_code_unique" UNIQUE("province_code")
);
--> statement-breakpoint
CREATE TABLE "masterdata"."region_syncs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"added_count" integer,
	"updated_count" integer,
	"error_category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "region_syncs_status_check" CHECK ("masterdata"."region_syncs"."status" in ('RUNNING', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "masterdata"."sub_districts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sub_district_code" text NOT NULL,
	"sub_district_name" text NOT NULL,
	"district_code" text NOT NULL,
	"zip_code" text NOT NULL,
	"last_sync_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "sub_districts_sub_district_code_unique" UNIQUE("sub_district_code")
);
--> statement-breakpoint
ALTER TABLE "masterdata"."cities" ADD CONSTRAINT "cities_province_code_provinces_province_code_fk" FOREIGN KEY ("province_code") REFERENCES "masterdata"."provinces"("province_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "masterdata"."districts" ADD CONSTRAINT "districts_city_code_cities_city_code_fk" FOREIGN KEY ("city_code") REFERENCES "masterdata"."cities"("city_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "masterdata"."sub_districts" ADD CONSTRAINT "sub_districts_district_code_districts_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "masterdata"."districts"("district_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cities_province_code_idx" ON "masterdata"."cities" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "cities_city_name_trgm" ON "masterdata"."cities" USING gin ("city_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "districts_city_code_idx" ON "masterdata"."districts" USING btree ("city_code");--> statement-breakpoint
CREATE INDEX "districts_district_name_trgm" ON "masterdata"."districts" USING gin ("district_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "provinces_province_name_trgm" ON "masterdata"."provinces" USING gin ("province_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "region_syncs_running_unique" ON "masterdata"."region_syncs" USING btree ("status") WHERE "masterdata"."region_syncs"."status" = 'RUNNING';--> statement-breakpoint
CREATE INDEX "region_syncs_finished_at_idx" ON "masterdata"."region_syncs" USING btree ("finished_at") WHERE "masterdata"."region_syncs"."status" = 'COMPLETED';--> statement-breakpoint
CREATE INDEX "sub_districts_district_code_idx" ON "masterdata"."sub_districts" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "sub_districts_sub_district_name_trgm" ON "masterdata"."sub_districts" USING gin ("sub_district_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "sub_districts_zip_code_trgm" ON "masterdata"."sub_districts" USING gin ("zip_code" gin_trgm_ops);