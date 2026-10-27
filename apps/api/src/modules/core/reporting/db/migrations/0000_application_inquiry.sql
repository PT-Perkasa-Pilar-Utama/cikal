CREATE SCHEMA IF NOT EXISTS "reporting";
--> statement-breakpoint
CREATE VIEW "reporting"."application_inquiry" WITH (security_invoker = true) AS (
    select a.tenant_id, a.id, a.loan_id, p.full_name, p.id_card_number_enc, p.id_card_number_key_version,
      a.product_id, pr.product_code, a.branch_id, b.branch_code, a.requested_limit, a.status,
      a.current_step as state, a.submitted_at, a.updated_at as modified_at, a.created_by
    from application.applications a
    join application.application_personals p on p.application_id = a.id
    join product.products pr on pr.id = a.product_id
    left join org.branches b on b.id = a.branch_id
  );