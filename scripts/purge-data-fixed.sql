-- Purge all data from SX-CRM tables (respecting foreign key constraints)
-- Run this in Supabase SQL Editor for clean database

-- Delete in correct dependency order
DELETE FROM activities;
DELETE FROM tasks;
DELETE FROM won_jobs;
DELETE FROM lead_opportunities;
DELETE FROM contact_persons;
DELETE FROM companies;
DELETE FROM tags;
DELETE FROM staff_members;
DELETE FROM users;

-- Reset all sequences
ALTER SEQUENCE IF EXISTS activities_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS won_jobs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS lead_opportunities_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS contact_persons_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS companies_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tags_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS staff_members_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- Delete custom stages (keep default ones)
DELETE FROM dynamic_op_stages WHERE is_custom = true;

-- Verify purge
SELECT 
  'activities' as table_name, COUNT(*) as row_count FROM activities
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'won_jobs', COUNT(*) FROM won_jobs
UNION ALL
SELECT 'lead_opportunities', COUNT(*) FROM lead_opportunities
UNION ALL
SELECT 'contact_persons', COUNT(*) FROM contact_persons
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'staff_members', COUNT(*) FROM staff_members
UNION ALL
SELECT 'users', COUNT(*) FROM users;
