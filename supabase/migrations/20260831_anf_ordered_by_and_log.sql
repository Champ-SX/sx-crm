-- ANF — "Ordered by" (procurement) on orders + a stock movement log.
-- Safe to run more than once.

ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS ordered_by text;

CREATE TABLE IF NOT EXISTS anf_stock_log (
  log_id     text PRIMARY KEY,
  board_id   text NOT NULL DEFAULT 'anf-order',
  stock_id   text,          -- stock row (product × branch) at time of event
  product_id text,
  branch     text,
  type       text NOT NULL, -- receive | transfer | check
  qty_delta  integer,       -- +/- change (null for a plain check that sets a value)
  qty_after  integer,       -- resulting on-hand
  by_name    text,          -- who did it (free text)
  note       text,          -- e.g. "WH → BACC" or order ref
  ref        text,          -- order_id / paired transfer id
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anf_stock_log_stock   ON anf_stock_log (stock_id);
CREATE INDEX IF NOT EXISTS idx_anf_stock_log_product ON anf_stock_log (product_id, branch);

ALTER TABLE anf_stock_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read anf_stock_log"  ON anf_stock_log FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write anf_stock_log" ON anf_stock_log FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
