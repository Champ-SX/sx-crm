-- ===== Users (for team management) =====
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Companies =====
CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_type TEXT, -- 'brand' | 'agency' | 'venue' | 'organizer' | 'individual' | 'partner'
  phone TEXT,
  email TEXT,
  line_id TEXT,
  social TEXT,
  tax_id TEXT,
  registered_address TEXT,
  branch_name TEXT,
  branch_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_branch TEXT,
  billing_notes TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Contact Persons =====
CREATE TABLE IF NOT EXISTS contact_persons (
  contact_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Lead Opportunities =====
CREATE TABLE IF NOT EXISTS lead_opportunities (
  lead_op_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_id TEXT REFERENCES companies(company_id),
  contact_person_id TEXT REFERENCES contact_persons(contact_id),
  customer_id TEXT, -- legacy FK for backwards compatibility
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  service_type TEXT NOT NULL,
  event_date DATE,
  venue TEXT,
  estimated_value INTEGER,
  owner TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'open', -- 'open' | 'won' | 'lost'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Dynamic OP Stages =====
CREATE TABLE IF NOT EXISTS dynamic_op_stages (
  stage_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  accent_color TEXT,
  dot_color TEXT,
  header_bg TEXT,
  column_bg TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Won Jobs =====
CREATE TABLE IF NOT EXISTS won_jobs (
  job_id TEXT PRIMARY KEY,
  event_date DATE,
  job_number TEXT UNIQUE,
  product_type TEXT,
  product_cat TEXT,
  product_name TEXT,
  place TEXT,
  event_display_name TEXT,
  event_time TEXT,
  venue TEXT,
  job_detail_notes TEXT,
  onsite_contact_name TEXT,
  onsite_contact_phone TEXT,
  onsite_line_id TEXT,
  install_point TEXT,
  team_meeting_time TEXT,
  onsite_notes TEXT,
  company_account JSONB, -- stores CompanyAccount object
  estimated_value INTEGER,
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid' | 'partial' | 'paid' | 'overdue'
  staff_status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'na'
  doc_status TEXT DEFAULT 'pending', -- 'pending' | 'ready' | 'na'
  op_stage TEXT DEFAULT 'WON_JOB_LIST',
  position INTEGER DEFAULT 0, -- Position within stage for vertical ordering (0 = first)
  owner TEXT,
  company_id TEXT REFERENCES companies(company_id),
  contact_person_id TEXT REFERENCES contact_persons(contact_id),
  customer_name TEXT,
  customer_id TEXT,
  lead_op_id TEXT REFERENCES lead_opportunities(lead_op_id),
  staff_list JSONB DEFAULT NULL, -- per-job StaffMember assignments (incl. fee_thb)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Activities =====
CREATE TABLE IF NOT EXISTS activities (
  activity_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'customer' | 'lead_opportunity' | 'won_job' | 'company' | 'contact_person'
  entity_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'note' | 'call' | 'email' | 'follow_up' | 'status_change' | 'deal_won' | 'deal_lost'
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attachments JSONB DEFAULT NULL -- Array of ActivityAttachment: {filename, size, type, data}
);

-- ===== Tasks =====
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'done'
  linked_entity_type TEXT, -- 'customer' | 'lead_opportunity' | 'won_job'
  linked_entity_id TEXT,
  linked_entity_name TEXT,
  owner TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Staff Members =====
CREATE TABLE IF NOT EXISTS staff_members (
  staff_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_branch TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Tags =====
CREATE TABLE IF NOT EXISTS tags (
  tag_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Indexes for common queries =====
-- ===== Indexes for common queries =====
CREATE INDEX IF NOT EXISTS idx_lead_opportunities_status ON lead_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_lead_opportunities_company ON lead_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_won_jobs_op_stage ON won_jobs(op_stage);
CREATE INDEX IF NOT EXISTS idx_won_jobs_company ON won_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_contact_persons_company ON contact_persons(company_id);

-- ===== Row Level Security (RLS) =====
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_op_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE won_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read companies"
  ON companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read contact_persons"
  ON contact_persons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read lead_opportunities"
  ON lead_opportunities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read dynamic_op_stages"
  ON dynamic_op_stages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read won_jobs"
  ON won_jobs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read activities"
  ON activities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read tasks"
  ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read staff_members"
  ON staff_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read tags"
  ON tags FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users to insert users"
  ON users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert companies"
  ON companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert contact_persons"
  ON contact_persons FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert lead_opportunities"
  ON lead_opportunities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert dynamic_op_stages"
  ON dynamic_op_stages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert won_jobs"
  ON won_jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert activities"
  ON activities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert staff_members"
  ON staff_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tags"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update policies
CREATE POLICY "Allow authenticated users to update users"
  ON users FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update companies"
  ON companies FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update contact_persons"
  ON contact_persons FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update lead_opportunities"
  ON lead_opportunities FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update dynamic_op_stages"
  ON dynamic_op_stages FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update won_jobs"
  ON won_jobs FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update activities"
  ON activities FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update tasks"
  ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update staff_members"
  ON staff_members FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update tags"
  ON tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Delete policies
CREATE POLICY "Allow authenticated users to delete users"
  ON users FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete companies"
  ON companies FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete contact_persons"
  ON contact_persons FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete lead_opportunities"
  ON lead_opportunities FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete dynamic_op_stages"
  ON dynamic_op_stages FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete won_jobs"
  ON won_jobs FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete activities"
  ON activities FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete tasks"
  ON tasks FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete staff_members"
  ON staff_members FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete tags"
  ON tags FOR DELETE
  USING (auth.role() = 'authenticated');
