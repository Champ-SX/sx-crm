-- Purge all data from SX-CRM tables
-- Run this in Supabase SQL Editor for clean database

-- Disable foreign key constraints temporarily
ALTER TABLE activities DISABLE TRIGGER ALL;
ALTER TABLE tasks DISABLE TRIGGER ALL;
ALTER TABLE won_jobs DISABLE TRIGGER ALL;
ALTER TABLE lead_opportunities DISABLE TRIGGER ALL;
ALTER TABLE contact_persons DISABLE TRIGGER ALL;
ALTER TABLE companies DISABLE TRIGGER ALL;
ALTER TABLE tags DISABLE TRIGGER ALL;
ALTER TABLE staff_members DISABLE TRIGGER ALL;
ALTER TABLE users DISABLE TRIGGER ALL;

-- Delete all data from tables
DELETE FROM activities;
DELETE FROM tasks;
DELETE FROM won_jobs;
DELETE FROM lead_opportunities;
DELETE FROM contact_persons;
DELETE FROM companies;
DELETE FROM tags;
DELETE FROM staff_members;

-- Delete custom stages (keep default ones)
DELETE FROM dynamic_op_stages WHERE is_custom = true;

-- Re-enable foreign key constraints
ALTER TABLE activities ENABLE TRIGGER ALL;
ALTER TABLE tasks ENABLE TRIGGER ALL;
ALTER TABLE won_jobs ENABLE TRIGGER ALL;
ALTER TABLE lead_opportunities ENABLE TRIGGER ALL;
ALTER TABLE contact_persons ENABLE TRIGGER ALL;
ALTER TABLE companies ENABLE TRIGGER ALL;
ALTER TABLE tags ENABLE TRIGGER ALL;
ALTER TABLE staff_members ENABLE TRIGGER ALL;
ALTER TABLE users ENABLE TRIGGER ALL;

-- Verify purge
SELECT 
  (SELECT COUNT(*) FROM activities) as activities_count,
  (SELECT COUNT(*) FROM tasks) as tasks_count,
  (SELECT COUNT(*) FROM won_jobs) as won_jobs_count,
  (SELECT COUNT(*) FROM lead_opportunities) as leads_count,
  (SELECT COUNT(*) FROM contact_persons) as contacts_count,
  (SELECT COUNT(*) FROM companies) as companies_count,
  (SELECT COUNT(*) FROM tags) as tags_count,
  (SELECT COUNT(*) FROM staff_members) as staff_count;
