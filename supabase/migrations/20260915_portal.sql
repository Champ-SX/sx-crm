-- Company Portal — brand-CI / resource portal for SIXSHEET Group + sub-brands.
-- Public (anon) sees company profiles + tier='public' resources only.
-- Any authenticated SX-CRM user reads everything and may write.
-- Safe to run more than once.

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_companies (
  key          text PRIMARY KEY,           -- sixsheet | captures | andyfine | sxtech
  name         text NOT NULL,
  tag          text,                        -- short badge, e.g. SX / CAP / ANF / SXT
  tabmeta      text,                         -- tab subtitle, e.g. "Holding"
  tagline      text,
  logo_path    text,                         -- Storage path in portal-logos
  legal_entity text,
  established  text,
  sector       text,
  hq           text,
  sort         int NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_resources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company    text NOT NULL REFERENCES portal_companies(key) ON DELETE CASCADE,
  section    text NOT NULL,                  -- Brand & Web | Operations | Finance & People | Company Docs
  tier       text NOT NULL CHECK (tier IN ('public','internal')),
  name       text NOT NULL,
  type       text,
  th         text,                            -- optional Thai gloss
  url        text,
  owner      text,
  status     text,                            -- 'active' | 'to add' | …
  sort       int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_resources_company ON portal_resources (company, section, sort);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE portal_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_resources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Companies: everyone reads; only signed-in users write.
  CREATE POLICY "portal_companies read all"      ON portal_companies FOR SELECT USING (true);
  CREATE POLICY "portal_companies write authed"  ON portal_companies FOR ALL    TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Resources: anon reads only public rows; authenticated reads everything.
  CREATE POLICY "portal_resources read public"   ON portal_resources FOR SELECT TO anon          USING (tier = 'public');
  CREATE POLICY "portal_resources read authed"   ON portal_resources FOR SELECT TO authenticated USING (true);
  CREATE POLICY "portal_resources write authed"  ON portal_resources FOR ALL    TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Storage bucket: portal-logos (public read, authenticated write) ──────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-logos', 'portal-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "portal logos public read"          ON storage.objects FOR SELECT USING (bucket_id = 'portal-logos');
  CREATE POLICY "portal logos authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portal-logos');
  CREATE POLICY "portal logos authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portal-logos');
  CREATE POLICY "portal logos authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portal-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed companies ──────────────────────────────────────────────────────────
INSERT INTO portal_companies (key, name, tag, tabmeta, tagline, sector, hq, sort) VALUES
  ('sixsheet','SIXSHEET','SX','Holding','Holding company for the group. Investor-facing brand and shared back-office systems.','Group / Holding','Bangkok, TH',0),
  ('captures','CAP*TURES','CAP','Experience Infra','Experience infrastructure — the photobooth ecosystem. Operator-grade capture systems for live events.','Creative technology','Bangkok, TH',1),
  ('andyfine','Andy & Fine.','ANF','Lifestyle','Lifestyle brand, IG / TikTok-first. Product operations and stock run through shared tooling.','Lifestyle / Retail','Bangkok, TH',2),
  ('sxtech','SX TECH','SXT','R&D / Tech','Experimental technology division. Internal R&D for capture systems, automation and new product bets.','Technology / R&D','Bangkok, TH',3)
ON CONFLICT (key) DO NOTHING;

-- ── Seed resources (only when the table is empty, so re-runs don't duplicate) ─
INSERT INTO portal_resources (company, section, tier, name, type, th, url, owner, status, sort)
SELECT * FROM (VALUES
  ('sixsheet','Brand & Web','public','Website','Website',NULL,'https://sixsheet.co','—','active',0),
  ('sixsheet','Brand & Web','public','Brand & Logo Docs','Brand assets','เอกสาร บริษัท',NULL,'—','to add',1),
  ('sixsheet','Finance & People','internal','FlowAccount','Accounting',NULL,'https://flowaccount.com/','Finance','active',0),
  ('sixsheet','Finance & People','internal','Flow HR','HR / Payroll',NULL,NULL,'HR','to add',1),
  ('sixsheet','Company Docs','internal','Company Drive','Google Drive',NULL,'https://drive.google.com/open?id=1gDxri3wSwzWjsmkKPUtrXa3uesqPA-ES&usp=drive_fs','Admin','active',0),
  ('captures','Brand & Web','public','Website','Website',NULL,'https://captures.photo/','—','active',0),
  ('captures','Brand & Web','public','Brand & Logo Docs','Brand assets','เอกสาร บริษัท','https://bestclus.com/d_cap/#brand-logos','—','active',1),
  ('captures','Operations','internal','OP · SX-CRM','Operations CRM',NULL,'https://sx-crm.vercel.app/','Ops','active',0),
  ('captures','Operations','internal','Machine No.','Fleet spreadsheet',NULL,'https://docs.google.com/spreadsheets/d/18-5WuCo_NWQuLJdQrBLRFNhQ4AxUNL9826bpq93tBGk/edit?usp=sharing','Ops','active',1),
  ('andyfine','Brand & Web','public','Link Hub','Bio / links',NULL,'https://lnk.bio/andyandfine','—','active',0),
  ('andyfine','Brand & Web','public','Brand & Logo Docs','Brand assets','เอกสาร บริษัท',NULL,'—','to add',1),
  ('andyfine','Operations','internal','OP · Trello','Operation board',NULL,'https://trello.com/b/86E0vHTC/%F0%9F%8F%87%F0%9F%8F%BCandy-operation-%F0%9F%8F%87%F0%9F%8F%BC','Ops','active',0),
  ('andyfine','Operations','internal','Order & Stock','Inventory',NULL,'https://sx-crm.vercel.app/anf-order','Ops','active',1),
  ('sxtech','Brand & Web','public','Website','Website',NULL,NULL,'—','to add',0),
  ('sxtech','Brand & Web','public','Brand & Logo Docs','Brand assets','เอกสาร บริษัท',NULL,'—','to add',1),
  ('sxtech','Operations','internal','R&D Board','Project board',NULL,NULL,'Tech','to add',0),
  ('sxtech','Operations','internal','Code Repository','Git / repo',NULL,NULL,'Tech','to add',1)
) AS seed(company, section, tier, name, type, th, url, owner, status, sort)
WHERE NOT EXISTS (SELECT 1 FROM portal_resources);
