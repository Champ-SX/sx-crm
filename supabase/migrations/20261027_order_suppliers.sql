-- Order board — Supplies / Assets kind + Suppliers directory (mockup sections 1, 3, 4).
-- Asset units / IDs / locations (section 2) come later.

-- 1 · Kind on every catalog product; existing products are supplies.
alter table anf_products add column if not exists kind text not null default 'supply';  -- supply | asset

-- 4 · Suppliers (shared contact list). No passwords / bank logins here.
create table if not exists anf_suppliers (
  supplier_id     text primary key,
  board_id        text not null default 'anf-order',
  name            text not null,
  contact_person  text,
  phone           text,
  line_id         text,
  email           text,
  website         text,          -- website / shop link (Shopee, Lazada…)
  address         text,
  tax_id          text,
  payment_terms   text,          -- cash | credit 30 | …
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3 · Item ↔ supplier link with ordering details; one link per item is preferred.
create table if not exists anf_product_suppliers (
  id            text primary key,
  product_id    text not null references anf_products(product_id) on delete cascade,
  supplier_id   text not null references anf_suppliers(supplier_id) on delete cascade,
  preferred     boolean not null default false,
  price         numeric,
  unit          text,
  lead_time     text,          -- "3–5 days"
  min_order     text,          -- "2 boxes"
  order_via     text,          -- LINE / email PO / shop link
  note          text,
  created_at    timestamptz not null default now(),
  unique (product_id, supplier_id)
);
create index if not exists idx_anf_ps_product  on anf_product_suppliers (product_id);
create index if not exists idx_anf_ps_supplier on anf_product_suppliers (supplier_id);

-- Which supplier an order went to.
alter table anf_orders add column if not exists supplier_id text references anf_suppliers(supplier_id) on delete set null;

-- RLS — any signed-in user can read; writes are allowed for signed-in users
-- (the app only shows edit controls to admins).
alter table anf_suppliers enable row level security;
alter table anf_product_suppliers enable row level security;
do $$ begin
  create policy "authenticated all anf_suppliers" on anf_suppliers for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all anf_product_suppliers" on anf_product_suppliers for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
