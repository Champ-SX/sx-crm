-- WON board — support multiple pinned payment cards (Adhoc + Part-time Andy & Fine.)
-- by tagging each adhoc_payments row with a `kind`. Existing rows are 'adhoc'.
-- Safe to run more than once.

ALTER TABLE adhoc_payments ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'adhoc';
CREATE INDEX IF NOT EXISTS idx_adhoc_payments_kind ON adhoc_payments (board_id, kind, archived, month);
