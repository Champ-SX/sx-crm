-- Order board · request approval (PR ≥ 10,000 THB needs Champ's approval)
-- Run in Supabase SQL editor. Safe to re-run.

alter table anf_requests
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  add column if not exists total_thb numeric,          -- incl. VAT, stored at submit / approval
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_reason text;

-- Requests created before approval existed keep working: treat them as approved.
update anf_requests set status = 'approved', approved_by = coalesce(approved_by, 'auto (pre-approval)')
where status = 'draft' and submitted_at is null and created_at < '2026-10-30';

create index if not exists anf_requests_status_idx on anf_requests (status);

-- Approval notifications point at a request.
alter table notifications drop constraint if exists notifications_entity_type_check;
alter table notifications add constraint notifications_entity_type_check
  check (entity_type in ('customer', 'lead_opportunity', 'won_job', 'anf_order', 'anf_task', 'anf_request'));
