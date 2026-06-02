-- ===== SEED DATA FOR SX-CRM =====
-- Run this script in Supabase SQL Editor after creating the schema
-- This populates the database with sample data for testing

-- ===== Sample Companies =====
INSERT INTO companies (company_id, company_name, company_type, email, phone, notes, created_at, updated_at)
VALUES
  ('cmp_001', 'ABC Brand Co.', 'brand', 'contact@abc.com', '+66-2-111-1111', 'Premium brand partner', NOW(), NOW()),
  ('cmp_002', 'XYZ Event Agency', 'agency', 'info@xyz.co.th', '+66-2-222-2222', 'Full service event agency', NOW(), NOW()),
  ('cmp_003', 'Grand Venue Bangkok', 'venue', 'booking@grandvenue.com', '+66-2-333-3333', 'Premium event venue', NOW(), NOW()),
  ('cmp_004', 'Festival Organizers Ltd.', 'organizer', 'events@festival.co.th', '+66-8-444-4444', 'Music festival specialists', NOW(), NOW()),
  ('cmp_005', 'Partnership Solutions', 'partner', 'partners@solutions.com', '+66-9-555-5555', 'Strategic partner', NOW(), NOW());

-- ===== Sample Contact Persons =====
INSERT INTO contact_persons (contact_id, company_id, name, email, phone, role, notes, created_at, updated_at)
VALUES
  ('con_001', 'cmp_001', 'Somchai Lertphueak', 'somchai@abc.com', '+66-8-111-1111', 'Marketing Manager', 'Main contact for ABC Brand', NOW(), NOW()),
  ('con_002', 'cmp_001', 'Niran Chittanond', 'niran@abc.com', '+66-8-111-1112', 'Events Lead', 'Handles event requests', NOW(), NOW()),
  ('con_003', 'cmp_002', 'Tippa Ratchasaen', 'tippa@xyz.co.th', '+66-8-222-2222', 'Creative Director', 'Designs event concepts', NOW(), NOW()),
  ('con_004', 'cmp_003', 'Pawan Sukkasem', 'pawan@grandvenue.com', '+66-8-333-3333', 'Venue Manager', 'Manages all venue bookings', NOW(), NOW()),
  ('con_005', 'cmp_004', 'Kanya Suwannapong', 'kanya@festival.co.th', '+66-8-444-4444', 'Event Coordinator', 'Main coordinator', NOW(), NOW());

-- ===== Dynamic OP Stages (REQUIRED) =====
INSERT INTO dynamic_op_stages (stage_id, label, "order", accent_color, dot_color, header_bg, column_bg, is_custom, created_at, updated_at)
VALUES
  ('WON_JOB_LIST', 'Job List', 1, 'blue', '#3B82F6', 'bg-blue-50', 'bg-blue-50/30', FALSE, NOW(), NOW()),
  ('PRE_JOB', 'Pre Job', 2, 'purple', '#A855F7', 'bg-purple-50', 'bg-purple-50/30', FALSE, NOW(), NOW()),
  ('ON_SITE', 'On Site', 3, 'green', '#10B981', 'bg-green-50', 'bg-green-50/30', FALSE, NOW(), NOW()),
  ('OP_DONE_PAYMENT', 'Payment Done', 4, 'amber', '#F59E0B', 'bg-amber-50', 'bg-amber-50/30', FALSE, NOW(), NOW());

-- ===== Sample Lead Opportunities =====
INSERT INTO lead_opportunities (lead_op_id, name, company_id, contact_person_id, customer_name, contact_person, service_type, event_date, venue, estimated_value, owner, notes, status, created_at, updated_at)
VALUES
  ('lo_001', 'Q2 Product Launch Event', 'cmp_001', 'con_001', 'ABC Brand Co.', 'Somchai Lertphueak', 'SX Event', '2026-06-15', 'Bangkok Convention Centre', 450000, 'Vitta', 'Premium launch event for new product line', 'open', NOW(), NOW()),
  ('lo_002', 'Summer Festival Activation', 'cmp_002', 'con_003', 'XYZ Event Agency', 'Tippa Ratchasaen', 'Custom Activation', '2026-07-20', 'Paragon Siam', 320000, 'Andy', 'Interactive brand experience booth', 'open', NOW(), NOW()),
  ('lo_003', 'Corporate Team Building', 'cmp_005', 'con_005', 'Partnership Solutions', 'Kanya Suwannapong', 'Booth Rental', '2026-06-28', 'Centara Grand', 180000, 'Nong', 'Annual corporate gathering', 'open', NOW(), NOW()),
  ('lo_004', 'Holiday Season Campaign', 'cmp_001', 'con_001', 'ABC Brand Co.', 'Somchai Lertphueak', 'CAP*TURES', '2026-12-01', 'EmQuartier', 280000, 'Fern', 'December holiday promotional event', 'open', NOW(), NOW()),
  ('lo_005', 'Music Festival Sponsorship', 'cmp_004', 'con_005', 'Festival Organizers Ltd.', 'Kanya Suwannapong', 'Booth Rental', '2026-08-10', 'Impact Arena', 350000, 'Vitta', 'Festival main stage sponsorship package', 'won', NOW(), NOW());

-- ===== Sample Won Jobs =====
INSERT INTO won_jobs (job_id, event_date, job_number, product_type, place, event_display_name, estimated_value, payment_status, op_stage, position, owner, company_id, contact_person_id, customer_name, lead_op_id, created_at, updated_at)
VALUES
  ('job_001', '2026-05-20', 'JOB-2026-001', 'Photography', 'Fashion Week Bangkok', 'Fashion Week Coverage', 220000, 'paid', 'OP_DONE_PAYMENT', 0, 'Vitta', 'cmp_001', 'con_001', 'ABC Brand Co.', 'lo_005', NOW(), NOW()),
  ('job_002', '2026-06-05', 'JOB-2026-002', 'Video Production', 'Corporate Event', 'Q1 Corporate Video', 380000, 'partial', 'ON_SITE', 0, 'Andy', 'cmp_002', 'con_003', 'XYZ Event Agency', NULL, NOW(), NOW()),
  ('job_003', '2026-05-30', 'JOB-2026-003', 'Photography', 'Warehouse Launch', 'Product Launch Photos', 150000, 'unpaid', 'PRE_JOB', 0, 'Fern', 'cmp_005', 'con_005', 'Partnership Solutions', NULL, NOW(), NOW()),
  ('job_004', '2026-07-15', 'JOB-2026-004', 'Event Activation', 'Shopping Mall', 'Summer Promo Booth', 280000, 'paid', 'OP_DONE_PAYMENT', 1, 'Nong', 'cmp_003', 'con_004', 'Grand Venue Bangkok', NULL, NOW(), NOW());

-- ===== Sample Staff Members =====
INSERT INTO staff_members (staff_id, name, nickname, phone, bank_name, bank_account_number, bank_account_name, bank_branch, created_at, updated_at)
VALUES
  ('staff_001', 'Vitta Vinlee', 'Vitta', '+66-8-123-4567', 'Kasikornbank', '123-456-789-0', 'V. Vinlee', 'Bangkok Branch', NOW(), NOW()),
  ('staff_002', 'Andy Somsakul', 'Andy', '+66-8-234-5678', 'Bangkok Bank', '234-567-890-1', 'A. Somsakul', 'Bangkok Branch', NOW(), NOW()),
  ('staff_003', 'Fern Pattanapong', 'Fern', '+66-8-345-6789', 'Krung Thai Bank', '345-678-901-2', 'F. Pattanapong', 'Bangkok Branch', NOW(), NOW()),
  ('staff_004', 'Nong Nitaya', 'Nong', '+66-8-456-7890', 'Siam Commercial', '456-789-012-3', 'N. Nitaya', 'Bangkok Branch', NOW(), NOW());

-- ===== Sample Tasks =====
INSERT INTO tasks (task_id, title, description, due_date, priority, status, linked_entity_type, linked_entity_id, linked_entity_name, owner, created_at, updated_at)
VALUES
  ('task_001', 'Confirm ABC Brand event details', 'Get final confirmation on guest list and catering', '2026-06-10', 'high', 'pending', 'lead_opportunity', 'lo_001', 'Q2 Product Launch Event', 'Vitta', NOW(), NOW()),
  ('task_002', 'Follow up with XYZ Agency', 'Send pricing proposal for summer activation', '2026-06-05', 'high', 'in_progress', 'lead_opportunity', 'lo_002', 'Summer Festival Activation', 'Andy', NOW(), NOW()),
  ('task_003', 'Prepare video edit for job_002', 'Final cut and color grading', '2026-06-20', 'medium', 'pending', 'won_job', 'job_002', 'Q1 Corporate Video', 'Andy', NOW(), NOW()),
  ('task_004', 'Invoice for job_001', 'Send payment request for Fashion Week Coverage', '2026-06-01', 'high', 'done', 'won_job', 'job_001', 'Fashion Week Coverage', 'Nong', NOW(), NOW()),
  ('task_005', 'Check venue availability', 'Confirm Paragon Siam booking for July 20', '2026-06-08', 'medium', 'pending', 'lead_opportunity', 'lo_002', 'Summer Festival Activation', 'Vitta', NOW(), NOW());

-- ===== Sample Activities =====
INSERT INTO activities (activity_id, entity_type, entity_id, activity_type, title, description, created_by, created_at)
VALUES
  ('act_001', 'lead_opportunity', 'lo_001', 'call', 'Initial consultation call', 'Discussed event scope and requirements with Somchai', 'Vitta', NOW()),
  ('act_002', 'lead_opportunity', 'lo_001', 'note', 'Budget approved', 'Client approved the ฿450,000 budget', 'Vitta', NOW()),
  ('act_003', 'lead_opportunity', 'lo_002', 'email', 'Proposal sent', 'Sent detailed proposal for summer activation', 'Andy', NOW()),
  ('act_004', 'won_job', 'job_001', 'status_change', 'Event completed', 'Fashion Week coverage completed successfully', 'Vitta', NOW()),
  ('act_005', 'lead_opportunity', 'lo_005', 'deal_won', 'Deal won', 'Festival sponsorship deal closed', 'Vitta', NOW());

-- ===== Tags (Optional) =====
INSERT INTO tags (tag_id, name, color, created_at)
VALUES
  ('tag_001', 'High Value', '#FF6B6B', NOW()),
  ('tag_002', 'Rush Job', '#FFD43B', NOW()),
  ('tag_003', 'Premium Client', '#51CF66', NOW()),
  ('tag_004', 'Recurring', '#4C6EF5', NOW());

-- ===== Summary =====
-- Created:
-- - 5 sample companies
-- - 5 sample contact persons
-- - 4 dynamic OP stages (required for kanban board)
-- - 5 lead opportunities (1 won, 4 open)
-- - 4 won jobs (1 paid, 1 partial, 1 unpaid, 1 in pre-job stage)
-- - 4 staff members
-- - 5 sample tasks (1 done, 1 in-progress, 3 pending)
-- - 5 sample activities
-- - 4 tags

COMMIT;
