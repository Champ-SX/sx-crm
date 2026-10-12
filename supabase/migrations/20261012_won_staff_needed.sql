-- WON board — how many staff an event needs (Operation calendar shows
-- assigned / needed). NULL = not set yet. Safe to run more than once.

ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS staff_needed integer
  CHECK (staff_needed IS NULL OR staff_needed >= 0);
