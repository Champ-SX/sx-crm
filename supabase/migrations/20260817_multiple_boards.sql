-- Phase 4.0 — Multiple Boards (business units / brands).
-- One active board per user; Leads, Won jobs and OP stages scope to a board.
-- Customers stay shared. Safe to run more than once.

-- 1. boards table
CREATE TABLE IF NOT EXISTS boards (
  board_id    text PRIMARY KEY,
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  color       text NOT NULL DEFAULT '#FF5B3F',
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read boards"  ON boards FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write boards" ON boards FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. seed the two brands (idempotent)
-- Rename an earlier 'andy-fine' seed to 'anf-order' if it exists (safe: nothing
-- is backfilled onto it yet).
UPDATE boards SET board_id = 'anf-order', name = 'ANF Order', slug = 'anf-order'
  WHERE board_id = 'andy-fine';

INSERT INTO boards (board_id, name, slug, color, sort_order) VALUES
  ('captures',   'CAP*TURES', 'captures',   '#FF5B3F', 0),
  ('anf-order',  'ANF Order', 'anf-order',  '#7A5AA5', 1)
ON CONFLICT (board_id) DO NOTHING;

-- 3. board_id on the scoped tables (dynamic_op_stages = custom OP stages;
--    built-in stages are app constants shown for every board)
ALTER TABLE lead_opportunities ADD COLUMN IF NOT EXISTS board_id text REFERENCES boards(board_id);
ALTER TABLE won_jobs           ADD COLUMN IF NOT EXISTS board_id text REFERENCES boards(board_id);
ALTER TABLE dynamic_op_stages  ADD COLUMN IF NOT EXISTS board_id text REFERENCES boards(board_id);

-- 4. backfill everything existing onto the CAP*TURES board
UPDATE lead_opportunities SET board_id = 'captures' WHERE board_id IS NULL;
UPDATE won_jobs           SET board_id = 'captures' WHERE board_id IS NULL;
UPDATE dynamic_op_stages  SET board_id = 'captures' WHERE board_id IS NULL;

-- 5. filter indexes
CREATE INDEX IF NOT EXISTS idx_lead_opportunities_board ON lead_opportunities (board_id);
CREATE INDEX IF NOT EXISTS idx_won_jobs_board           ON won_jobs (board_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_op_stages_board  ON dynamic_op_stages (board_id);
