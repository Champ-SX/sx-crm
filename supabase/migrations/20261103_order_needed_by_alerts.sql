-- Order board · "Needed by" alerts on requests (sent by the existing due-notify cron).
-- Stamps make each alert fire once. Run in Supabase SQL editor. Safe to re-run.
alter table anf_requests
  add column if not exists soon_notified_at timestamptz,   -- "needed in ≤3 days, not ordered yet"
  add column if not exists late_notified_at timestamptz;   -- "past needed by, not received"
