CREATE SCHEMA IF NOT EXISTS "product";
--> statement-breakpoint
CREATE TABLE "product"."products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"product_category" text NOT NULL,
	"interest_type" text NOT NULL,
	"contract_type" text,
	"min_plafond" numeric(18, 2) NOT NULL,
	"max_plafond" numeric(18, 2) NOT NULL,
	"min_tenor" integer NOT NULL,
	"max_tenor" integer NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"max_age_at_maturity_month" integer,
	"dbr_max" numeric(9, 4) NOT NULL,
	"dsr" numeric(9, 4),
	"multiple_salary_dbr" numeric(9, 4),
	"admin_fee" numeric(18, 2) DEFAULT '0' NOT NULL,
	"provision_fee" numeric(9, 4) DEFAULT '0' NOT NULL,
	"sales_fee" numeric(18, 2),
	"limit_auto_approval" numeric(18, 2) DEFAULT '0' NOT NULL,
	"scoring_approval" boolean,
	"is_paylater" boolean,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "products_product_code_check" CHECK ("product"."products"."product_code" ~ '^[A-Za-z0-9]{1,5}$'),
	CONSTRAINT "products_product_name_check" CHECK (char_length("product"."products"."product_name") <= 100),
	CONSTRAINT "products_product_category_check" CHECK ("product"."products"."product_category" in ('COLLATERAL', 'NON_COLLATERAL', 'PENSION', 'SYARIAH')),
	CONSTRAINT "products_interest_type_check" CHECK ("product"."products"."interest_type" in ('FLAT', 'EFFECTIVE', 'FLOATING', 'HYBRID', 'CAPPED')),
	CONSTRAINT "products_plafond_check" CHECK ("product"."products"."max_plafond" > "product"."products"."min_plafond"),
	CONSTRAINT "products_limit_auto_approval_check" CHECK ("product"."products"."limit_auto_approval" <= "product"."products"."max_plafond"),
	CONSTRAINT "products_valid_to_check" CHECK ("product"."products"."valid_to" >= "product"."products"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "product"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product"."sub_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"interest_rate" numeric(9, 4) NOT NULL,
	"floating_rate" numeric(9, 4),
	"cap_rate" numeric(9, 4),
	"tenor_fixed" integer,
	"approver_rate_min" numeric(9, 4),
	"approver_rate_max" numeric(9, 4),
	"valid_from" date NOT NULL,
	"valid_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "sub_products_interest_rate_check" CHECK ("product"."sub_products"."interest_rate" > 0),
	CONSTRAINT "sub_products_approver_rate_min_check" CHECK ("product"."sub_products"."approver_rate_min" <= "product"."sub_products"."interest_rate"),
	CONSTRAINT "sub_products_approver_rate_max_check" CHECK ("product"."sub_products"."approver_rate_max" >= "product"."sub_products"."interest_rate"),
	CONSTRAINT "sub_products_valid_to_check" CHECK ("product"."sub_products"."valid_to" >= "product"."sub_products"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "product"."sub_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product"."products" ADD CONSTRAINT "products_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."sub_products" ADD CONSTRAINT "sub_products_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."sub_products" ADD CONSTRAINT "sub_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_tenant_product_code_unique" ON "product"."products" USING btree ("tenant_id",upper("product_code"));--> statement-breakpoint
CREATE INDEX "sub_products_product_id_idx" ON "product"."sub_products" USING btree ("product_id","valid_from");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."products" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."sub_products" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);