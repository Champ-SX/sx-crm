-- SPRINT 1 CRITICAL-1: Verify Position Field NULLs
-- Run this in Supabase SQL Editor against production database
-- Date: June 2, 2026

-- ============================================================================
-- STEP 1: Check for NULL position values
-- ============================================================================
SELECT
  COUNT(*) as null_count,
  COUNT(CASE WHEN position IS NULL THEN 1 END) as jobs_with_null_position
FROM won_jobs;

-- Result: null_count should equal (total - jobs_with_null_position)
-- If jobs_with_null_position > 0, migration needed

-- ============================================================================
-- STEP 2: If NULLs found, show details
-- ============================================================================
SELECT
  id, job_number, op_stage, position, created_at
FROM won_jobs
WHERE position IS NULL
ORDER BY op_stage, created_at;

-- ============================================================================
-- STEP 3: If migration needed, run this:
-- ============================================================================
-- CAUTION: This assigns position values to NULL entries
-- Do NOT run unless you've confirmed NULLs exist!

UPDATE won_jobs
SET position = row_number() OVER (PARTITION BY op_stage ORDER BY created_at)
WHERE position IS NULL;

-- ============================================================================
-- STEP 4: Verify migration succeeded
-- ============================================================================
SELECT
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN position IS NOT NULL THEN 1 END) as jobs_with_position,
  COUNT(CASE WHEN position IS NULL THEN 1 END) as jobs_still_null
FROM won_jobs;

-- Result: jobs_still_null should be 0

-- ============================================================================
-- STEP 5: Spot-check data looks correct
-- ============================================================================
SELECT op_stage, COUNT(*) as job_count, MIN(position) as min_pos, MAX(position) as max_pos
FROM won_jobs
GROUP BY op_stage
ORDER BY op_stage;

-- Expected: Each stage should have continuous position values (0, 1, 2, 3...)
-- If you see gaps, there may be a data issue

-- ============================================================================
-- VERIFICATION COMPLETE
-- All position values should be populated and unique within each stage
-- ============================================================================
