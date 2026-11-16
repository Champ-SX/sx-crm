-- Sales · Finance: gateway imports (KBank · Pay Solution · ChillPay) → client reports.
-- Access: admins + users ticked in Admin › Users ("Sales" column). Safe to re-run.

-- 1. Who can open a restricted page (besides admins).
CREATE TABLE IF NOT EXISTS page_access (
  page       text NOT NULL,          -- 'sales'
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page, user_id)
);
ALTER TABLE page_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION has_page_access(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE (u.id::text = auth.uid()::text OR lower(u.email) = lower(auth.jwt() ->> 'email')) AND u.role = 'admin')
      OR EXISTS (SELECT 1 FROM page_access a WHERE a.page = p AND a.user_id IN (
           SELECT auth.uid()::text UNION SELECT u.id::text FROM users u WHERE lower(u.email) = lower(auth.jwt() ->> 'email')))
$$;
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE (u.id::text = auth.uid()::text OR lower(u.email) = lower(auth.jwt() ->> 'email')) AND u.role = 'admin')
$$;
DO $$ BEGIN
  CREATE POLICY "signed-in read page_access" ON page_access FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "admins write page_access"   ON page_access FOR ALL    USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Upload history.
CREATE TABLE IF NOT EXISTS sales_imports (
  import_id  text PRIMARY KEY,
  files      jsonb NOT NULL DEFAULT '[]',   -- [{name, format, rows, new, dup, conflict, review, excluded, from, to, gross}]
  new_rows   int NOT NULL DEFAULT 0,
  dup_rows   int NOT NULL DEFAULT 0,
  review_rows int NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. One row per payment. key = gateway|merchant|transaction id (unique → re-uploads add nothing).
CREATE TABLE IF NOT EXISTS sales_txns (
  key            text PRIMARY KEY,
  gateway        text NOT NULL CHECK (gateway IN ('kbank', 'paysolution', 'chillpay')),
  merchant_id    text NOT NULL DEFAULT '',
  txn_id         text NOT NULL DEFAULT '',
  alt_ref        text,
  machine        int,
  raw_machine    text,
  biz_date       date,
  biz_time       text,
  amount_satang  bigint NOT NULL,
  fee_satang     bigint,
  net_satang     bigint,
  method         text,
  channel        text,
  status         text NOT NULL DEFAULT 'unknown',
  txn_status     text,
  settle_status  text,
  partner_id     text,
  partner_name   text,
  partner_shop_id text,
  source_row     int,
  source_file    text,
  review         text,             -- null = accepted; else why it waits for a person
  alt_date       text,
  conflict       jsonb,            -- a later upload disagreed: {amount_satang, biz_date, machine, file, at}
  import_id      text REFERENCES sales_imports(import_id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_txns (biz_date);
CREATE INDEX IF NOT EXISTS idx_sales_machine ON sales_txns (machine, biz_date);
CREATE INDEX IF NOT EXISTS idx_sales_review ON sales_txns (review) WHERE review IS NOT NULL OR conflict IS NOT NULL;

ALTER TABLE sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_txns    ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "sales users all sales_imports" ON sales_imports FOR ALL USING (has_page_access('sales')) WITH CHECK (has_page_access('sales'));
  CREATE POLICY "sales users all sales_txns"    ON sales_txns    FOR ALL USING (has_page_access('sales')) WITH CHECK (has_page_access('sales'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

SELECT 'ok' AS sales_tables;
