-- Create customers table (legacy, for migration purposes)
CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_name for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read customers"
  ON customers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy to allow all authenticated users to insert
CREATE POLICY "Allow authenticated users to insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow all authenticated users to update
CREATE POLICY "Allow authenticated users to update customers"
  ON customers FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow all authenticated users to delete
CREATE POLICY "Allow authenticated users to delete customers"
  ON customers FOR DELETE
  USING (auth.role() = 'authenticated');
