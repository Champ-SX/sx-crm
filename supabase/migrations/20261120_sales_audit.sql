-- Sales · Finance audit log: every change to sales money, written by the database itself
-- (triggers), so no screen or script can skip it. Read-only for everyone — no one can edit
-- or delete entries (no insert/update/delete policies; triggers insert as SECURITY DEFINER).

CREATE TABLE IF NOT EXISTS sales_audit (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  actor      text,                 -- signed-in email, or the import's created_by for automatic imports
  action     text NOT NULL,        -- imported · voided · restored · deleted_upload · edited_payment · excluded_payment · ...
  import_id  text,
  txn_key    text,
  summary    text,                 -- one human line
  reason     text,
  detail     jsonb                 -- before / after values
);
CREATE INDEX IF NOT EXISTS sales_audit_at ON sales_audit (at DESC);
CREATE INDEX IF NOT EXISTS sales_audit_txn ON sales_audit (txn_key);
ALTER TABLE sales_audit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "sales users read sales_audit" ON sales_audit FOR SELECT USING (has_page_access('sales'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reason for a payment edit travels with the update (set by the app, read by the trigger)
ALTER TABLE sales_txns ADD COLUMN IF NOT EXISTS edit_reason text;

CREATE OR REPLACE FUNCTION sales_actor(fallback text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(auth.jwt() ->> 'email', ''), fallback, 'system')
$$;

-- Uploads: imported / voided / restored / deleted
CREATE OR REPLACE FUNCTION sales_audit_imports() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE names text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT string_agg(f ->> 'name', ', ') INTO names FROM jsonb_array_elements(OLD.files) f;
    INSERT INTO sales_audit (actor, action, import_id, summary, reason, detail)
    VALUES (sales_actor(NULL), 'deleted_upload', OLD.import_id, 'Deleted upload permanently: ' || COALESCE(names, ''), OLD.void_reason,
            jsonb_build_object('files', OLD.files, 'new_rows', OLD.new_rows, 'created_by', OLD.created_by, 'created_at', OLD.created_at));
    RETURN OLD;
  END IF;
  SELECT string_agg(f ->> 'name', ', ') INTO names FROM jsonb_array_elements(NEW.files) f;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sales_audit (actor, action, import_id, summary, detail)
    VALUES (sales_actor(NEW.created_by), 'imported', NEW.import_id,
            'Imported ' || COALESCE(names, '') || ' · ' || NEW.new_rows || ' new · ' || NEW.dup_rows || ' dup · ' || NEW.review_rows || ' review',
            jsonb_build_object('files', NEW.files, 'created_by', NEW.created_by));
  ELSIF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    INSERT INTO sales_audit (actor, action, import_id, summary, reason)
    VALUES (sales_actor(NEW.voided_by), 'voided', NEW.import_id, 'Voided upload ' || COALESCE(names, '') || ' · ' || NEW.new_rows || ' payments', NEW.void_reason);
  ELSIF NEW.voided_at IS NULL AND OLD.voided_at IS NOT NULL THEN
    INSERT INTO sales_audit (actor, action, import_id, summary, reason)
    VALUES (sales_actor(NULL), 'restored', NEW.import_id, 'Restored upload ' || COALESCE(names, ''), OLD.void_reason);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sales_audit_imports ON sales_imports;
CREATE TRIGGER sales_audit_imports AFTER INSERT OR UPDATE OR DELETE ON sales_imports FOR EACH ROW EXECUTE FUNCTION sales_audit_imports();

-- Payments: changes to money, date, machine, status or review decisions
-- (bulk void/restore and import inserts are logged once per upload above, not per payment)
CREATE OR REPLACE FUNCTION sales_audit_txns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chg jsonb := '{}'; act text := 'edited_payment'; parts text[] := '{}';
BEGIN
  IF NEW.amount_satang IS DISTINCT FROM OLD.amount_satang THEN chg := chg || jsonb_build_object('amount_satang', jsonb_build_array(OLD.amount_satang, NEW.amount_satang)); parts := parts || format('amount %s → %s', OLD.amount_satang / 100.0, NEW.amount_satang / 100.0); END IF;
  IF NEW.biz_date IS DISTINCT FROM OLD.biz_date THEN chg := chg || jsonb_build_object('biz_date', jsonb_build_array(OLD.biz_date, NEW.biz_date)); parts := parts || format('date %s → %s', OLD.biz_date, NEW.biz_date); END IF;
  IF NEW.machine IS DISTINCT FROM OLD.machine THEN chg := chg || jsonb_build_object('machine', jsonb_build_array(OLD.machine, NEW.machine)); parts := parts || format('machine %s → %s', COALESCE(OLD.machine::text, '—'), COALESCE(NEW.machine::text, '—')); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN chg := chg || jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status)); parts := parts || format('status %s → %s', OLD.status, NEW.status);
     IF NEW.status = 'excluded' THEN act := 'excluded_payment'; END IF; END IF;
  IF NEW.review IS DISTINCT FROM OLD.review THEN chg := chg || jsonb_build_object('review', jsonb_build_array(OLD.review, NEW.review));
     IF NEW.review IS NULL THEN parts := parts || format('review cleared (%s)', OLD.review); END IF; END IF;
  IF (NEW.conflict IS NULL) <> (OLD.conflict IS NULL) AND NEW.voided = OLD.voided THEN chg := chg || jsonb_build_object('conflict', jsonb_build_array(OLD.conflict, NEW.conflict));
     parts := parts || CASE WHEN NEW.conflict IS NULL THEN 'conflict resolved' ELSE 'conflict raised by ' || (NEW.conflict ->> 'file') END; END IF;
  IF chg <> '{}' AND NEW.import_id IS NOT DISTINCT FROM OLD.import_id THEN
    INSERT INTO sales_audit (actor, action, import_id, txn_key, summary, reason, detail)
    VALUES (sales_actor(CASE WHEN NEW.conflict IS NOT NULL AND OLD.conflict IS NULL THEN 'Auto-import' END), act, NEW.import_id, NEW.key,
            NEW.txn_id || ' · ' || array_to_string(parts, ' · '), NEW.edit_reason, chg);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sales_audit_txns ON sales_txns;
CREATE TRIGGER sales_audit_txns AFTER UPDATE ON sales_txns FOR EACH ROW EXECUTE FUNCTION sales_audit_txns();
