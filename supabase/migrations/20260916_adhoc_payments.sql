-- WON board — "Adhoc Payment": a pinned card in the wait-staff-payment column
-- for one-off staff payments not tied to a won job. One card per month; past
-- months are archived (read-only). Safe to run more than once.

CREATE TABLE IF NOT EXISTS adhoc_payments (
  id         text PRIMARY KEY,
  board_id   text NOT NULL DEFAULT 'won',
  month      text NOT NULL,                       -- 'YYYY-MM' the card belongs to
  jobs       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ id, title, staff_list:[StaffMember] }]
  archived   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adhoc_payments_board ON adhoc_payments (board_id, archived, month);

ALTER TABLE adhoc_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read adhoc_payments"  ON adhoc_payments FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write adhoc_payments" ON adhoc_payments FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
