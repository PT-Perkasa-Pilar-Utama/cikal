CREATE TABLE "product"."document_checklist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_checklist_items_document_unique" UNIQUE("checklist_id","document_type")
);
--> statement-breakpoint
ALTER TABLE "product"."document_checklist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product"."document_checklists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"occupation" text NOT NULL,
	"marital" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "document_checklists_combination_unique" UNIQUE("tenant_id","product_id","occupation","marital")
);
--> statement-breakpoint
ALTER TABLE "product"."document_checklists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product"."document_checklist_items" ADD CONSTRAINT "document_checklist_items_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."document_checklist_items" ADD CONSTRAINT "document_checklist_items_checklist_id_document_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "product"."document_checklists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."document_checklists" ADD CONSTRAINT "document_checklists_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product"."document_checklists" ADD CONSTRAINT "document_checklists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."document_checklist_items" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "product"."document_checklists" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);