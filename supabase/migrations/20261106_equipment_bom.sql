-- Equipment by product (BOM). Replaces equipment sets (SET1/SET2/…).
-- Run in Supabase SQL editor. Safe to re-run. Units already on an event keep
-- their job; they show as "Other units on this job" until picked on a product.

create table if not exists rental_products (
  product_id  text primary key,
  name        text not null unique,
  notes       text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists rental_bom_lines (
  id              text primary key,
  product_id      text not null references rental_products(product_id) on delete cascade,
  kind            text not null check (kind in ('equipment', 'accessory', 'consumable')),
  label           text not null,
  category        text,             -- equipment: asset category that fills it (camera, printer…)
  anf_product_id  text,             -- equipment: preferred model · consumable: catalog item
  qty             numeric not null default 1,
  unit            text,
  optional        boolean not null default false,
  position        int not null default 0
);
create index if not exists rental_bom_lines_product_idx on rental_bom_lines (product_id);

-- A product on a Won job, with its BOM copied in (editing a BOM later doesn't change packed jobs).
create table if not exists job_kits (
  id          text primary key,
  job_id      text not null references won_jobs(job_id) on delete cascade,
  product_id  text references rental_products(product_id) on delete set null,
  name        text not null,
  kit_no      int  not null default 1,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists job_kits_job_idx on job_kits (job_id);

create table if not exists job_kit_lines (
  id              text primary key,
  kit_id          text not null references job_kits(id) on delete cascade,
  job_id          text not null,
  kind            text not null,
  label           text not null,
  category        text,
  anf_product_id  text,
  slot            int not null default 1,
  of_qty          int not null default 1,
  qty             numeric not null default 1,
  unit            text,
  optional        boolean not null default false,
  asset_id        text references anf_assets(asset_id) on delete set null,
  packed          boolean not null default false,
  position        int not null default 0
);
create index if not exists job_kit_lines_kit_idx on job_kit_lines (kit_id);
create index if not exists job_kit_lines_job_idx on job_kit_lines (job_id);

alter table rental_products  enable row level security;
alter table rental_bom_lines enable row level security;
alter table job_kits         enable row level security;
alter table job_kit_lines    enable row level security;
do $$ begin
  create policy "authenticated all rental_products"  on rental_products  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all rental_bom_lines" on rental_bom_lines for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all job_kits"         on job_kits         for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  create policy "authenticated all job_kit_lines"    on job_kit_lines    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- The CAP*TURES range (BOMs are filled in on the Products page).
insert into rental_products (product_id, name, position) values
  ('rp-popup-studio', 'Popup Studio', 0), ('rp-lca-ipad', 'LCA iPad', 1), ('rp-photo-moov', 'Photo Moov', 2),
  ('rp-story-booth', 'Story Booth', 3), ('rp-auto-snap', 'Auto Snap', 4), ('rp-top-view', 'Top View', 5),
  ('rp-tally', 'Tally', 6), ('rp-standard', 'Standard', 7), ('rp-box-shot', 'Box Shot', 8),
  ('rp-ai-booth', 'AI Booth', 9), ('rp-newspaper-photo-booth', 'Newspaper Photo Booth', 10), ('rp-what-s-in-my-bag', 'What''s in my Bag', 11)
on conflict (product_id) do nothing;
