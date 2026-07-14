-- Phase 2.7 — schedule the due-date reminder cron (run AFTER 20260714_won_due_date.sql)
--
-- Prereqs (one-time, via Supabase Dashboard → Database → Extensions, or below):
--   • pg_cron  — schedules the job
--   • pg_net   — lets Postgres POST to the app endpoint
-- Also set two env vars in Vercel: CRON_SECRET (any long random string) and
-- SUPABASE_SERVICE_ROLE_KEY (already present). Put the SAME CRON_SECRET below.
--
-- Replace <CRON_SECRET> and the URL host if your prod domain differs.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Only POSTs to the app when at least one job's reminder time has arrived,
-- so polling stays inside Postgres (≈zero egress) until there's real work.
create or replace function public.trigger_due_notify()
returns void
language plpgsql
security definer
as $$
begin
  if exists (
    select 1 from won_jobs
    where due_at is not null
      and due_notified_at is null
      and (due_at - make_interval(mins => coalesce(due_lead_minutes, 0))) <= now()
  ) then
    perform net.http_post(
      url     := 'https://sx-crm.vercel.app/api/cron/due-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<CRON_SECRET>'
      ),
      body    := '{}'::jsonb
    );
  end if;
end;
$$;

-- Run every 3 minutes. Idempotent — unschedule any existing job first.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'won-due-notify') then
    perform cron.unschedule('won-due-notify');
  end if;
end $$;
select cron.schedule('won-due-notify', '*/3 * * * *', $$select public.trigger_due_notify()$$);
