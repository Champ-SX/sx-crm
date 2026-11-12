-- Andy & Fine. room kit: graphic links + camera / flash presets, referenced by tasks.
-- Run AFTER 20261114_anf_project_board.sql. Safe to re-run.

create table if not exists anf_room_assets (
  asset_id    text primary key,
  code        text not null unique,          -- GA-0412 · CAM-BACC-A64 · FL-BACC-A64 · DIR-BACC-A62 (room Drive folder)
  kind        text not null check (kind in ('frame','gif','welcome','other','camera','flash','source','folder')),
  branch      text,                          -- null = all branches
  room        text,                          -- null = whole branch
  name        text not null,
  url         text,                          -- Google Drive link (graphics)
  status      text not null default 'draft' check (status in ('draft','approved','live','retired')),
  version     int  not null default 1,
  settings    jsonb not null default '{}'::jsonb,
  photos      jsonb not null default '[]'::jsonb,   -- latest output photos (attachment refs)
  history     jsonb not null default '[]'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_by  text,
  updated_at  timestamptz not null default now()
);
-- One camera preset, one flash preset and one Drive folder per room.
create unique index if not exists anf_room_assets_one_preset
  on anf_room_assets (kind, coalesce(branch, ''), coalesce(room, '')) where kind in ('camera','flash','folder');
create index if not exists anf_room_assets_place on anf_room_assets (branch, room);

alter table anf_room_assets enable row level security;
drop policy if exists anf_room_assets_rw on anf_room_assets;
create policy anf_room_assets_rw on anf_room_assets for all to authenticated using (true) with check (true);

-- Tasks reference assets.
alter table anf_tasks add column if not exists asset_ids text[] not null default '{}';

-- Move graphics that were added inside tasks into the library (under the task's branch / room).
with g as (
  select t.task_id, t.branch, t.room, e.value as v,
         row_number() over (order by t.created_at, e.ordinality) as n
  from anf_tasks t, jsonb_array_elements(coalesce(t.graphics, '[]'::jsonb)) with ordinality e
), base as (
  select coalesce(max(substring(code from '^GA-(\d+)$')::int), 0) as m from anf_room_assets
), ins as (
  insert into anf_room_assets (asset_id, code, kind, branch, room, name, url, status, version, created_by, created_at, updated_by, updated_at)
  select 'as-' || (g.v->>'id'), 'GA-' || lpad((base.m + g.n)::text, 4, '0'),
         coalesce(g.v->>'kind', 'other'), g.branch, g.room, coalesce(g.v->>'name', 'Graphic'), g.v->>'url',
         coalesce(g.v->>'status', 'draft'), coalesce((g.v->>'version')::int, 1),
         g.v->>'added_by', coalesce((g.v->>'added_at')::timestamptz, now()), g.v->>'added_by', now()
  from g, base
  on conflict (asset_id) do nothing
  returning asset_id
)
update anf_tasks t set asset_ids = (
  select coalesce(array_agg('as-' || (e->>'id')), '{}') from jsonb_array_elements(coalesce(t.graphics, '[]'::jsonb)) e
) || t.asset_ids
where jsonb_array_length(coalesce(t.graphics, '[]'::jsonb)) > 0 and not (t.asset_ids && array(select 'as-' || (e->>'id') from jsonb_array_elements(t.graphics) e));

select kind, count(*) from anf_room_assets group by kind order by 1;
