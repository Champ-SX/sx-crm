-- Phase 5 — Card actions: Archive.
-- Adds an is_archived flag to lead and won-job cards. Archived cards are hidden
-- from the boards but kept in the DB (restorable via the card's ⋯ menu).
-- Safe to run more than once.
ALTER TABLE lead_opportunities ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE won_jobs           ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Optional: speed up the "hide archived" filter as data grows.
CREATE INDEX IF NOT EXISTS idx_lead_opportunities_is_archived ON lead_opportunities (is_archived);
CREATE INDEX IF NOT EXISTS idx_won_jobs_is_archived ON won_jobs (is_archived);
