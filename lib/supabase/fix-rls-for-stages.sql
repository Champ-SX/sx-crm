-- Fix RLS policies for dynamic_op_stages to allow both anon and authenticated users
-- This allows custom stages to be created and updated without losing them on page refresh

-- Drop and recreate INSERT policy for dynamic_op_stages
DROP POLICY IF EXISTS "Allow authenticated users to insert dynamic_op_stages" ON dynamic_op_stages;
CREATE POLICY "Allow all users to insert dynamic_op_stages"
  ON dynamic_op_stages FOR INSERT
  WITH CHECK (true);

-- Drop and recreate UPDATE policy for dynamic_op_stages
DROP POLICY IF EXISTS "Allow authenticated users to update dynamic_op_stages" ON dynamic_op_stages;
CREATE POLICY "Allow all users to update dynamic_op_stages"
  ON dynamic_op_stages FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Drop and recreate DELETE policy for dynamic_op_stages
DROP POLICY IF EXISTS "Allow authenticated users to delete dynamic_op_stages" ON dynamic_op_stages;
CREATE POLICY "Allow all users to delete dynamic_op_stages"
  ON dynamic_op_stages FOR DELETE
  USING (true);
