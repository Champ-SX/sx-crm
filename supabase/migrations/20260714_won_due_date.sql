-- Phase 2.7 — Won card due date + scheduled push
-- Adds due datetime, a per-card lead-time (minutes before due to notify),
-- extra assignees to notify (beyond owner), and a dedup stamp.

ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS due_at            TIMESTAMPTZ;
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS due_lead_minutes  INTEGER;      -- minutes before due_at to fire (0 = at due time)
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS assignee_ids      TEXT[];       -- users.id[] to notify in addition to the owner
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS due_notified_at   TIMESTAMPTZ;  -- set when the due notification has fired (dedup)

-- Partial index: the cron only ever scans jobs that still need notifying.
CREATE INDEX IF NOT EXISTS idx_won_jobs_due_pending
  ON won_jobs (due_at)
  WHERE due_at IS NOT NULL AND due_notified_at IS NULL;
