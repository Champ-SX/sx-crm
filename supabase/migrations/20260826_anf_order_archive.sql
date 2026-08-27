-- ANF Order — soft archive received orders (hide from the board without deleting;
-- they stay in each item's stock history). Plus a nightly auto-archive of
-- received orders older than 90 days. Safe to run more than once.

ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Nightly auto-archive (pure SQL, no HTTP). 18:00 UTC ≈ 01:00 Asia/Bangkok.
-- Idempotent: drop any prior job with this name, then (re)create it.
DO $$ BEGIN
  PERFORM cron.unschedule('anf-archive-received');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'anf-archive-received',
  '0 18 * * *',
  $$ UPDATE anf_orders
       SET archived_at = now()
     WHERE status = 'received'
       AND archived_at IS NULL
       AND received_at IS NOT NULL
       AND received_at < (now() - interval '90 days') $$
);
