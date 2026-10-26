-- Order board · section 2 — asset units (one row per physical item), locations, move log.
-- Code = category prefix + running number (CAM-001); never re-used (retire, don't delete).

create table if not exists anf_assets (
  asset_id        text primary key,
  board_id        text not null default 'anf-order',
  code            text not null unique,          -- CAM-001
  product_id      text not null references anf_products(product_id),
  serial          text,
  purchase_date   date,
  value_thb       numeric,
  warranty_until  date,
  location_kind   text not null default 'rack',  -- rack | factory | event | repair | lost | retired
  location_slot   text,                          -- R1-A … / EV1 …
  job_id          text references won_jobs(job_id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_anf_assets_product on anf_assets (product_id);
create index if not exists idx_anf_assets_job on anf_assets (job_id);

create table if not exists anf_asset_moves (
  id          text primary key,
  asset_id    text not null references anf_assets(asset_id) on delete cascade,
  from_label  text,
  to_label    text not null,
  job_id      text,
  moved_by    text,
  moved_at    timestamptz not null default now(),
  note        text
);
create index if not exists idx_anf_asset_moves_asset on anf_asset_moves (asset_id, moved_at desc);

alter table anf_assets enable row level security;
alter table anf_asset_moves enable row level security;
do $$ begin
  create policy "authenticated all anf_assets" on anf_assets for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all anf_asset_moves" on anf_asset_moves for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
