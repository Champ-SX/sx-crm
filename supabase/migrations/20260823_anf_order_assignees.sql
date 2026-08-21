-- ANF Order — multiple assignees per order (mirrors lead_opportunities.assignee_ids).
-- Adds assignee_ids and backfills from the single assignee_id. Safe to re-run.

ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS assignee_ids text[] NOT NULL DEFAULT '{}';

-- Backfill: wrap the existing single assignee into the array (only when empty).
UPDATE anf_orders
  SET assignee_ids = ARRAY[assignee_id]
  WHERE assignee_id IS NOT NULL
    AND (assignee_ids IS NULL OR array_length(assignee_ids, 1) IS NULL);

CREATE INDEX IF NOT EXISTS idx_anf_orders_assignees ON anf_orders USING gin (assignee_ids);
