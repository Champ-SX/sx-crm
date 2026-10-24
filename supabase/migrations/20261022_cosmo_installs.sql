-- Cosmo (Bestclus) sync — setup / teardown rows linked to Won jobs by job #.
-- Written by /api/cron/cosmo-sync (service role). Read-only for signed-in users.
-- HOLD rows and rows without a job number are not stored.
--
-- BEFORE RUNNING: replace <CRON_SECRET> near the bottom with the same value as the
-- CRON_SECRET env var in Vercel (the one already used by the due-notify reminder).

create table if not exists cosmo_installs (
  booking_id          text not null,
  type                text not null,          -- setup | teardown (Cosmo's value)
  running_number      int  not null,          -- = won_jobs.job_number
  type_label          text,
  at                  timestamptz,            -- phase arrival time
  status              text,                   -- CONFIRMED | COMPLETED
  title               text,
  event_name          text,
  customer_name       text,
  product             text,
  skus                text[],
  quantity            int,
  venue_name          text,
  venue_address       text,
  map_url             text,
  event_start         timestamptz,
  event_end           timestamptz,
  site_contact_name   text,
  site_contact_phone  text,
  install_teams       text[],
  synced_at           timestamptz not null default now(),
  primary key (booking_id, type)
);
create index if not exists idx_cosmo_installs_rn on cosmo_installs (running_number);

alter table cosmo_installs enable row level security;
do $$ begin
  create policy "authenticated read cosmo_installs" on cosmo_installs for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Last sync time + result (shown next to "Sync now").
create table if not exists cosmo_sync_log (
  id       bigint generated always as identity primary key,
  ran_at   timestamptz not null default now(),
  ok       boolean not null,
  rows     int,
  message  text
);
alter table cosmo_sync_log enable row level security;
do $$ begin
  create policy "authenticated read cosmo_sync_log" on cosmo_sync_log for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Every 30 minutes (pg_cron + pg_net are already enabled for due-notify).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cosmo-sync') then
    perform cron.unschedule('cosmo-sync');
  end if;
end $$;
select cron.schedule('cosmo-sync', '*/30 * * * *', $cron$
  select net.http_post(
    url     := 'https://sx-crm.vercel.app/api/cron/cosmo-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  )
$cron$);
