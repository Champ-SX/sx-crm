-- Deal value can be a fixed price or our % share of the client's gross sales.
-- estimated_value keeps holding the money figure (fixed amount, or % × est.
-- sales) so every existing total / dashboard stays correct. Safe to re-run.
ALTER TABLE lead_opportunities ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'fixed'
  CHECK (value_type IN ('fixed', 'gp_share'));
ALTER TABLE lead_opportunities ADD COLUMN IF NOT EXISTS gp_share_pct numeric CHECK (gp_share_pct IS NULL OR (gp_share_pct >= 0 AND gp_share_pct <= 100));
ALTER TABLE lead_opportunities ADD COLUMN IF NOT EXISTS est_gross_sales numeric CHECK (est_gross_sales IS NULL OR est_gross_sales >= 0);

ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'fixed'
  CHECK (value_type IN ('fixed', 'gp_share'));
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS gp_share_pct numeric CHECK (gp_share_pct IS NULL OR (gp_share_pct >= 0 AND gp_share_pct <= 100));
ALTER TABLE won_jobs ADD COLUMN IF NOT EXISTS est_gross_sales numeric CHECK (est_gross_sales IS NULL OR est_gross_sales >= 0);
