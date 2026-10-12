-- WON board — inventory prep status for the Operation calendar.
-- none = ยังไม่เตรียม, partial = เตรียมบางส่วน, ready = พร้อมแล้ว.
-- Set by hand for now; a future inventory system can write the same column.
-- Safe to run more than once.

ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS inventory_status text NOT NULL DEFAULT 'none'
  CHECK (inventory_status IN ('none', 'partial', 'ready'));
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS inventory_note text;
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS inventory_updated_by text;
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS inventory_updated_at timestamptz;
