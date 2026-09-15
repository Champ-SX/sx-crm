-- Company Portal — copyable detail blocks (document-header address, shipping
-- address, bank details, …). Visible text + per-line copy + copy-all.
-- Each block carries its own tier (public | internal), gated like resources.
-- Run after 20260915_portal.sql. Safe to run more than once.

CREATE TABLE IF NOT EXISTS portal_detail_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company    text NOT NULL REFERENCES portal_companies(key) ON DELETE CASCADE,
  tier       text NOT NULL CHECK (tier IN ('public','internal')),
  title      text NOT NULL,          -- e.g. "Document-header address"
  th         text,                    -- Thai gloss for the title
  icon       text,                    -- optional Tabler icon name (e.g. file-invoice)
  heading    text,                    -- bold name line (e.g. legal name TH)
  subheading text,                    -- secondary line (e.g. legal name EN)
  lines      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ "label": "...", "value": "..." }]
  sort       int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_detail_blocks_company ON portal_detail_blocks (company, sort);

ALTER TABLE portal_detail_blocks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "portal_blocks read public"  ON portal_detail_blocks FOR SELECT TO anon          USING (tier = 'public');
  CREATE POLICY "portal_blocks read authed"  ON portal_detail_blocks FOR SELECT TO authenticated USING (true);
  CREATE POLICY "portal_blocks write authed" ON portal_detail_blocks FOR ALL    TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the SIXSHEET document-header address (public — it prints on quotes/invoices).
INSERT INTO portal_detail_blocks (company, tier, title, th, icon, heading, subheading, lines, sort)
SELECT 'sixsheet', 'public', 'Document-header address', 'ที่อยู่ออกหัวเอกสาร · ใบเสนอราคา, ใบกำกับภาษี', 'file-invoice',
  'บริษัท ซิกซีท กรุ๊ป จำกัด', 'SIXSHEET GROUP COMPANY LIMITED',
  '[{"label":"Tax ID · ภาษี","value":"0105559003122"},{"label":"Address · ที่อยู่","value":"15 ห้องเลขที่ A124 ซอย ประดิพัทธ์ 17 ถนนประดิพัทธ์ แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400"},{"label":"Phone · โทร","value":"080-268-6632"}]'::jsonb, 0
WHERE NOT EXISTS (SELECT 1 FROM portal_detail_blocks WHERE company = 'sixsheet');
