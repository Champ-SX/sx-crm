-- Company Portal — downloadable documents (registration, ภ.พ.20, bank book, …).
-- Files live in the portal-docs storage bucket; each row is a named document
-- with a tier. Run after 20260915_portal.sql. Safe to run more than once.

CREATE TABLE IF NOT EXISTS portal_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company    text NOT NULL REFERENCES portal_companies(key) ON DELETE CASCADE,
  tier       text NOT NULL CHECK (tier IN ('public','internal')),
  name       text NOT NULL,
  file_path  text,                 -- storage path in portal-docs
  file_name  text,                 -- original filename (for the download name)
  sort       int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_documents_company ON portal_documents (company, sort);

ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "portal_docs read public"  ON portal_documents FOR SELECT TO anon          USING (tier = 'public');
  CREATE POLICY "portal_docs read authed"  ON portal_documents FOR SELECT TO authenticated USING (true);
  CREATE POLICY "portal_docs write authed" ON portal_documents FOR ALL    TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket: portal-docs (public read, authenticated write/delete)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-docs', 'portal-docs', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "portal docs public read"          ON storage.objects FOR SELECT USING (bucket_id = 'portal-docs');
  CREATE POLICY "portal docs authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portal-docs');
  CREATE POLICY "portal docs authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portal-docs');
  CREATE POLICY "portal docs authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portal-docs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
