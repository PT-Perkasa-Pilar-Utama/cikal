-- Migrasi custom (CODING_STANDARD §6.3): integration_call_logs dipartisi bulanan per started_at, waktu Asia/Jakarta,
-- untuk retensi 1 tahun (technical-specs 06 §6.10, NF-31). Tabel lama diganti; datanya disalin ke partisi.
ALTER TABLE "integration"."integration_call_logs" RENAME TO "integration_call_logs_unpartitioned";--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs_unpartitioned" RENAME CONSTRAINT "integration_call_logs_id_started_at_pk" TO "integration_call_logs_unpartitioned_pk";--> statement-breakpoint
ALTER INDEX "integration"."integration_call_logs_application_idx" RENAME TO "integration_call_logs_unpartitioned_application_idx";--> statement-breakpoint
CREATE TABLE "integration"."integration_call_logs" (
	"id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_code" text NOT NULL,
	"provider_code" text,
	"direction" text NOT NULL,
	"application_id" uuid,
	"loan_id" text,
	"step_execution_id" uuid,
	"correlation_id" text NOT NULL,
	"external_reference" text,
	"attempt" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error_category" text,
	"error_message" text,
	"request_masked" jsonb NOT NULL,
	"response_masked" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "integration_call_logs_id_started_at_pk" PRIMARY KEY("id","started_at"),
	CONSTRAINT "integration_call_logs_direction_check" CHECK ("integration"."integration_call_logs"."direction" in ('OUTBOUND', 'INBOUND')),
	CONSTRAINT "integration_call_logs_status_check" CHECK ("integration"."integration_call_logs"."status" in ('SUCCESS', 'ERROR')),
	CONSTRAINT "integration_call_logs_category_check" CHECK ("integration"."integration_call_logs"."error_category" in ('TIMEOUT', 'CONNECTION', 'PROVIDER_ERROR', 'AUTH', 'CONFIG', 'INVALID_RESPONSE')),
	CONSTRAINT "integration_call_logs_attempt_check" CHECK ("integration"."integration_call_logs"."attempt" >= 1)
) PARTITION BY RANGE ("started_at");--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integration"."integration_call_logs" ADD CONSTRAINT "integration_call_logs_tenant_id_companies_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_call_logs_application_idx" ON "integration"."integration_call_logs" USING btree ("application_id","started_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "integration"."integration_call_logs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Partisi satu bulan bernama integration_call_logs_pYYYYMM. RLS partisi tanpa policy menolak akses langsung role
-- aplikasi; akses lewat tabel induk memakai policy tenant_isolation induk.
CREATE FUNCTION "integration"."create_call_log_partition"(p_month date) RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
SET "TimeZone" = 'Asia/Jakarta'
AS $$
DECLARE
	v_start date := date_trunc('month', p_month)::date;
	v_name text := 'integration_call_logs_p' || to_char(v_start, 'YYYYMM');
BEGIN
	IF to_regclass(format('integration.%I', v_name)) IS NOT NULL THEN
		RETURN;
	END IF;
	EXECUTE format(
		'CREATE TABLE integration.%I PARTITION OF integration.integration_call_logs FOR VALUES FROM (%L) TO (%L)',
		v_name, v_start::timestamptz, (v_start + interval '1 month')::timestamptz
	);
	EXECUTE format('ALTER TABLE integration.%I ENABLE ROW LEVEL SECURITY', v_name);
END
$$;--> statement-breakpoint
-- Dipanggil runner setelah migrasi dan job harian worker (role aplikasi): partisi bulan berjalan dan 2 bulan
-- berikutnya dibuat, partisi yang seluruh rentangnya lebih dari 1 tahun lalu dihapus. Tanpa parameter agar
-- pemanggil tidak bisa memajukan batas retensi.
CREATE FUNCTION "integration"."maintain_call_log_partitions"() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
SET "TimeZone" = 'Asia/Jakarta'
AS $$
DECLARE
	v_month date := date_trunc('month', now())::date;
	v_cutoff date := (date_trunc('month', now()) - interval '1 year')::date;
	v_offset integer;
	v_partition record;
BEGIN
	FOR v_offset IN 0..2 LOOP
		PERFORM integration.create_call_log_partition((v_month + make_interval(months => v_offset))::date);
	END LOOP;
	FOR v_partition IN
		SELECT child.relname
		FROM pg_inherits inh
		JOIN pg_class child ON child.oid = inh.inhrelid
		WHERE inh.inhparent = 'integration.integration_call_logs'::regclass
	LOOP
		IF to_date(right(v_partition.relname, 6), 'YYYYMM') + interval '1 month' <= v_cutoff THEN
			EXECUTE format('DROP TABLE integration.%I', v_partition.relname);
		END IF;
	END LOOP;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "integration"."create_call_log_partition"(date) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "integration"."maintain_call_log_partitions"() FROM PUBLIC;--> statement-breakpoint
DO $$
DECLARE
	v_month date;
	v_last date := (date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') + interval '2 months')::date;
BEGIN
	SELECT date_trunc('month', min("started_at") AT TIME ZONE 'Asia/Jakarta')::date INTO v_month
	FROM "integration"."integration_call_logs_unpartitioned";
	v_month := least(coalesce(v_month, v_last), v_last);
	WHILE v_month <= v_last LOOP
		PERFORM integration.create_call_log_partition(v_month);
		v_month := (v_month + interval '1 month')::date;
	END LOOP;
END
$$;--> statement-breakpoint
INSERT INTO "integration"."integration_call_logs" SELECT * FROM "integration"."integration_call_logs_unpartitioned";--> statement-breakpoint
DROP TABLE "integration"."integration_call_logs_unpartitioned";--> statement-breakpoint
SELECT "integration"."maintain_call_log_partitions"();
