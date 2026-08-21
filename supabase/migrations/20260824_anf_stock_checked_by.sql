-- ANF Stock — record who did the count. Captured via a save-time prompt when
-- On hand or Checked date changes. Distinct from `sign` (the receiver on Last-in).
-- Safe to run more than once.

ALTER TABLE anf_stock ADD COLUMN IF NOT EXISTS checked_by text;
