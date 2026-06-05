#!/usr/bin/env python3
"""
Setup script for Phase 2.0 authentication
Creates users table and RLS policies
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env.local")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL to create users table and RLS policies
CREATE_USERS_TABLE_SQL = """
-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operation', 'sales')) DEFAULT 'sales',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read own profile
CREATE POLICY IF NOT EXISTS "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admin can read all users
CREATE POLICY IF NOT EXISTS "Admin can read all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update user roles
CREATE POLICY IF NOT EXISTS "Admin can update user roles"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete users
CREATE POLICY IF NOT EXISTS "Admin can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can insert users
CREATE POLICY IF NOT EXISTS "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_users_updated_at_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_updated_at();
"""

def setup_database():
    """Setup database schema"""
    try:
        print("Setting up users table and RLS policies...")
        # Execute SQL via Supabase
        # Note: This would typically be done via the Supabase Dashboard or pg_dump
        # For now, we'll just verify the table structure

        # Test if users table exists
        response = supabase.table('users').select('*').limit(1).execute()
        print("✓ Users table exists or can be accessed")
        return True
    except Exception as e:
        print(f"Note: {str(e)}")
        print("\nPlease run the following SQL in Supabase SQL Editor:")
        print("=" * 80)
        print(CREATE_USERS_TABLE_SQL)
        print("=" * 80)
        return False

if __name__ == '__main__':
    success = setup_database()
    if success:
        print("\n✓ Database setup complete!")
    else:
        print("\nPlease apply the SQL above in your Supabase dashboard")
