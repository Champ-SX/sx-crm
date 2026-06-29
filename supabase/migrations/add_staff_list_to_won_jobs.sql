-- Add staff_list column to won_jobs if it doesn't exist.
-- The WonJob type carries staff_list (per-job staff assignments, incl. fee_thb),
-- but the table never had the column — so adding/updating staff failed with
-- "Failed to update won job". Stored as JSON to match company_account.
ALTER TABLE won_jobs
ADD COLUMN IF NOT EXISTS staff_list JSONB DEFAULT NULL;

COMMENT ON COLUMN won_jobs.staff_list IS 'Array of StaffMember objects assigned to this job (incl. per-job fee_thb), stored as JSON';
