-- Phase 2.8: Storage bucket for activity attachments.
-- Files move out of activities.attachments (base64 JSONB) into this bucket;
-- rows keep only { filename, size, type, storage_path }. Public read (paths
-- are unguessable UUIDs), authenticated-only write/delete.

INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "activity attachments public read" ON storage.objects;
CREATE POLICY "activity attachments public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-attachments');

DROP POLICY IF EXISTS "activity attachments authenticated upload" ON storage.objects;
CREATE POLICY "activity attachments authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-attachments');

DROP POLICY IF EXISTS "activity attachments authenticated delete" ON storage.objects;
CREATE POLICY "activity attachments authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'activity-attachments');
