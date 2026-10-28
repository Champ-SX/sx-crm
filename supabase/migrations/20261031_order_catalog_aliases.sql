-- Order board · catalog search: other names an item is known by (Thai name, "4x6", old code…).
-- Run in Supabase SQL editor. Safe to re-run.
alter table anf_products add column if not exists aliases text[] not null default '{}';
