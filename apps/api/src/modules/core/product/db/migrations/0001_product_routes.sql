CREATE TABLE "product"."product_route_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"step_code" text NOT NULL,
	"is_enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "product_route_steps_version_step_unique" UNIQUE("version_id","step_code"),
	CONSTRAINT "product_route_steps_step_code_check" CHECK ("product"."product_route_steps"."step_code" in ('DATA_ENTRY', 'SURVEY', 'DEDUP', 'DUKCAPIL', 'NAME_SCREENING', 'VERIFICATION', 'FRAUD', 'RAC', 'SCORING', 'CREDIT_BUREAU', 'DECISION', 'SIKP', 'APPROVAL', 'EPOLIS', 'VALIDITY_CHECK', 'PRINT_AKAD', 'DISBURSEMENT', 'WAIT_CORE'))
);
--> statement-breakpoint
ALTER TABLE "product"."product_route_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product"."product_route_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"effective_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "product_route_versions_route_version_unique" UNIQUE("route_id","version_number"),
	CONSTRAINT "product_route_versions_status_check" CHECK ("product"."product_route_versions"."status" in ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "product_route_versions_version_number_check" CHECK ("product"."product_route_versions"."version_number" >= 1),
	CONSTRAINT "product_route_versions_effective_from_check" CHECK ("product"."product_route_versions"."status" <> 'ACTIVE' or "product"."product_route_versions"."effective_from" is not null)
);
--> statement-breakpoint
ALTER TABLE "product"."product_route_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product"."product_routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "product_routes_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
ALTER TABLE "product"."product_routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product"."product_route_steps" ADD CONSTRAINT "product_route_steps_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."product_route_steps" ADD CONSTRAINT "product_route_steps_version_id_product_route_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "product"."product_route_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."product_route_versions" ADD CONSTRAINT "product_route_versions_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."product_route_versions" ADD CONSTRAINT "product_route_versions_route_id_product_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "product"."product_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."product_routes" ADD CONSTRAINT "product_routes_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."product_routes" ADD CONSTRAINT "product_routes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_route_versions_active_unique" ON "product"."product_route_versions" USING btree ("route_id") WHERE "product"."product_route_versions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."product_route_steps" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."product_route_versions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."product_routes" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);