-- Order board · emergency POs. Normally the buyer (admin@sixsheet.me) makes POs;
-- anyone else may in an emergency, with a reason. Run in Supabase SQL editor. Safe to re-run.
alter table anf_pos
  add column if not exists emergency_by text,
  add column if not exists emergency_reason text,
  add column if not exists emergency_at timestamptz;
