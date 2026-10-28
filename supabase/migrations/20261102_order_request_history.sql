-- Order board · who did what on each request (PR): account ids next to names + a history log.
-- Run in Supabase SQL editor. Safe to re-run.

alter table anf_requests
  add column if not exists created_by_id text,
  add column if not exists submitted_by text,
  add column if not exists submitted_by_id text,
  add column if not exists approved_by_id text;

create table if not exists anf_request_events (
  id          text primary key,
  request_id  text not null,
  action      text not null,          -- created | submitted | approved | rejected | withdrawn | item_added | item_removed | item_changed | added_to_po | ordered | po_cancelled | received
  detail      text,
  actor       text,                   -- display name at the time
  actor_id    text,                   -- users.id
  at          timestamptz not null default now()
);
create index if not exists anf_request_events_request_idx on anf_request_events (request_id, at);

alter table anf_request_events enable row level security;
drop policy if exists "anf_request_events signed-in read" on anf_request_events;
create policy "anf_request_events signed-in read" on anf_request_events for select to authenticated using (true);
drop policy if exists "anf_request_events signed-in insert" on anf_request_events;
create policy "anf_request_events signed-in insert" on anf_request_events for insert to authenticated with check (true);
