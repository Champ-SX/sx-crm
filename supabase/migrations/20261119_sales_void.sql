-- Sales · Finance: "void" instead of delete (who / when / why, restorable).
-- Voided payments drop out of every report; Restore brings them back.
-- File fingerprints (sha256) live inside sales_imports.files (jsonb) — no column needed.

ALTER TABLE sales_imports ADD COLUMN IF NOT EXISTS voided_at   timestamptz;
ALTER TABLE sales_imports ADD COLUMN IF NOT EXISTS voided_by   text;
ALTER TABLE sales_imports ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE sales_txns ADD COLUMN IF NOT EXISTS voided boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS sales_txns_live_date ON sales_txns (biz_date) WHERE NOT voided;
CREATE INDEX IF NOT EXISTS sales_txns_import ON sales_txns (import_id);
