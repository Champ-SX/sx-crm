-- CAPTURES.DESIGNER — artwork deliverables on Won jobs.
-- Owned by the separate Designer app (sx-designer); SX-CRM only reads it.
-- One row per deliverable (print frame, GIF frame, welcome screen, booth wrap, 3D proof…).
-- Files live in Google Drive / Canva; we only store links.

alter table won_jobs add column if not exists aw_drive_folder text;
alter table won_jobs add column if not exists aw_start_mode  text;   -- 'reference' | 'adapt'

create table if not exists won_artwork_items (
  id                  text primary key,
  job_id              text not null references won_jobs(job_id) on delete cascade,
  kind                text not null,            -- print | gif | welcome | wrap | proof3d | sent | other
  label               text,                     -- e.g. "2×6 strip", "K009 · 5 panels + lightbox"
  sizes               text[],                   -- GIF: story_9_16, portrait_4_5, landscape_16_9 …
  owner_id            text,                     -- users.id (Champ / OP staff)
  status              text not null default 'todo',  -- todo | draft | sent | approved
  version             int  not null default 0,
  drive_url           text,
  canva_url           text,
  paid                boolean,                  -- welcome screen: Free (false) / Paid (true)
  price_thb           numeric,
  price_confirmed_by  text,
  price_confirmed_at  timestamptz,
  notes               text,
  position            int  not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_won_artwork_job on won_artwork_items (job_id);

alter table won_artwork_items enable row level security;
do $$ begin
  create policy "authenticated all won_artwork_items" on won_artwork_items for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
