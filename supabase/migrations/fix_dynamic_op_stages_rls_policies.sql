-- Fix RLS policies for dynamic_op_stages to allow anonymous users
-- The application uses anonymous key, so we need to allow anon role in addition to authenticated

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read dynamic_op_stages" ON dynamic_op_stages;
DROP POLICY IF EXISTS "Allow authenticated users to insert dynamic_op_stages" ON dynamic_op_stages;
DROP POLICY IF EXISTS "Allow authenticated users to update dynamic_op_stages" ON dynamic_op_stages;
DROP POLICY IF EXISTS "Allow authenticated users to delete dynamic_op_stages" ON dynamic_op_stages;

-- Create updated policies that allow both authenticated and anonymous users
CREATE POLICY "Allow authenticated users to read dynamic_op_stages"
  ON dynamic_op_stages FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "Allow authenticated users to insert dynamic_op_stages"
  ON dynamic_op_stages FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "Allow authenticated users to update dynamic_op_stages"
  ON dynamic_op_stages FOR UPDATE
  USING (auth.role() IN ('authenticated', 'anon'))
  WITH CHECK (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "Allow authenticated users to delete dynamic_op_stages"
  ON dynamic_op_stages FOR DELETE
  USING (auth.role() IN ('authenticated', 'anon'));
