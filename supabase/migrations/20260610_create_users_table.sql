-- Create users table for Phase 2.0 authentication
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'operation', -- 'admin' | 'operation' | 'sales' | 'user'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all users
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert users
CREATE POLICY "Allow authenticated users to insert users"
  ON users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update users
CREATE POLICY "Allow authenticated users to update users"
  ON users FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete users
CREATE POLICY "Allow authenticated users to delete users"
  ON users FOR DELETE
  USING (auth.role() = 'authenticated');
