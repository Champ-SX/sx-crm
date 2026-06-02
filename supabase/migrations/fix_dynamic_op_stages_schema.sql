-- Fix dynamic_op_stages table schema to match TypeScript interface
-- Rename columns from snake_case to camelCase and stage_id to id

-- Create a temporary table with the new schema
CREATE TABLE IF NOT EXISTS dynamic_op_stages_new (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  accentColor TEXT,
  dotColor TEXT,
  headerBg TEXT,
  columnBg TEXT,
  isCustom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table if it exists and has data
INSERT INTO dynamic_op_stages_new (id, label, "order", accentColor, dotColor, headerBg, columnBg, isCustom, created_at, updated_at)
SELECT stage_id, label, "order", accent_color, dot_color, header_bg, column_bg, is_custom, created_at, updated_at
FROM dynamic_op_stages
ON CONFLICT (id) DO NOTHING;

-- Drop the old table
DROP TABLE IF EXISTS dynamic_op_stages;

-- Rename the new table
ALTER TABLE dynamic_op_stages_new RENAME TO dynamic_op_stages;

-- Recreate RLS policies for the fixed table
ALTER TABLE dynamic_op_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read dynamic_op_stages"
  ON dynamic_op_stages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert dynamic_op_stages"
  ON dynamic_op_stages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update dynamic_op_stages"
  ON dynamic_op_stages FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete dynamic_op_stages"
  ON dynamic_op_stages FOR DELETE
  USING (auth.role() = 'authenticated');
