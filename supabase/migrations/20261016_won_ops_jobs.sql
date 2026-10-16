-- Ops jobs: internal operation tasks added straight onto Won & Ready (no lead,
-- no deal value, no per-job staff payment). Numbered OPS-01, OPS-02… Safe to re-run.
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS is_ops boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_won_jobs_is_ops ON won_jobs (is_ops) WHERE is_ops;
