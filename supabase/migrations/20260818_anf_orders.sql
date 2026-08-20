-- ANF Order board — stock / consumables order list (own structure, not the
-- CAP*TURES sales pipeline). Lives under board_id = 'anf-order'.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS anf_orders (
  order_id      text PRIMARY KEY,
  board_id      text NOT NULL DEFAULT 'anf-order' REFERENCES boards(board_id),
  item          text NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  unit_price    numeric NOT NULL DEFAULT 0,
  with_vat      boolean NOT NULL DEFAULT false,   -- include 7% VAT in the total
  branch        text,
  ordered_at    date,
  needed_by     date,
  remind_option text NOT NULL DEFAULT 'none',     -- none | 1d | 1w | 1m | custom
  remind_at     timestamptz,                      -- fire time (computed or custom); null = no reminder
  remind_notified_at timestamptz,                 -- dedup once fired
  requested_by  text,                             -- who raised the request (name)
  assignee_id   text,                             -- who procures it (users.id)
  status        text NOT NULL DEFAULT 'to_order', -- to_order | ordered | received
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anf_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read anf_orders"  ON anf_orders FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write anf_orders" ON anf_orders FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_anf_orders_board  ON anf_orders (board_id);
CREATE INDEX IF NOT EXISTS idx_anf_orders_branch ON anf_orders (branch);
CREATE INDEX IF NOT EXISTS idx_anf_orders_status ON anf_orders (status);
