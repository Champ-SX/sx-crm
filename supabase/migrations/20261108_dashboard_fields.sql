-- Dashboard insights: lead source, lost reason, and stage history.
-- Run in Supabase SQL editor. Safe to re-run. Existing leads keep empty values.

alter table lead_opportunities
  add column if not exists source      text,   -- LINE OA | Website | Repeat client | Referral | Agency | Instagram / FB | Other
  add column if not exists lost_reason text,   -- required in the app when marking Lost
  add column if not exists lost_note   text;

-- The date every lead changes status and every Won job changes stage (funnel, on-time, time-in-stage).
create table if not exists stage_history (
  id           text primary key,
  entity_type  text not null check (entity_type in ('lead_opportunity', 'won_job')),
  entity_id    text not null,
  from_stage   text,
  to_stage     text not null,
  changed_by   text,
  changed_at   timestamptz not null default now()
);
create index if not exists stage_history_entity_idx on stage_history (entity_type, entity_id, changed_at);

alter table stage_history enable row level security;
drop policy if exists "stage_history signed-in read" on stage_history;
create policy "stage_history signed-in read" on stage_history for select to authenticated using (true);
drop policy if exists "stage_history signed-in insert" on stage_history;
create policy "stage_history signed-in insert" on stage_history for insert to authenticated with check (true);
