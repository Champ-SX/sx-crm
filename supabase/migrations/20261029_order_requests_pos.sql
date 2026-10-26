-- Order board — two steps: Requests (by project) → POs (by supplier). Phase 1 (no FlowAccount yet).
-- Items stay in anf_orders (receiving / stock top-up unchanged) and point at their request + PO.
-- Orders without a request (quick ＋Order, older orders) show as 1-item "Stock refill" requests.

create table if not exists anf_requests (
  request_id    text primary key,
  board_id      text not null default 'anf-order',
  number        text not null unique,        -- REQ-2026-10-014
  project_kind  text not null default 'free', -- refill | job | free
  job_id        text references won_jobs(job_id) on delete set null,
  project_name  text,
  needed_by     date,
  deliver_to    text,                         -- branch / Warehouse
  created_by    text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists anf_pos (
  po_id        text primary key,
  board_id     text not null default 'anf-order',
  number       text not null unique,          -- PO2026100002
  supplier_id  text references anf_suppliers(supplier_id) on delete set null,
  status       text not null default 'draft',  -- draft | ordered | cancelled
  fa_doc_no    text,                           -- FlowAccount PO number (phase 2)
  fa_url       text,
  created_by   text,
  notes        text,
  ordered_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table anf_orders add column if not exists request_id text references anf_requests(request_id) on delete set null;
alter table anf_orders add column if not exists po_id      text references anf_pos(po_id) on delete set null;
alter table anf_orders add column if not exists unit       text;
create index if not exists idx_anf_orders_request on anf_orders (request_id);
create index if not exists idx_anf_orders_po on anf_orders (po_id);

alter table anf_requests enable row level security;
alter table anf_pos enable row level security;
do $$ begin
  create policy "authenticated all anf_requests" on anf_requests for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all anf_pos" on anf_pos for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
