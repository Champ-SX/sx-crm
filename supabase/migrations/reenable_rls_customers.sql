-- SECURITY FIX: lock down the customers table.
-- RLS was off AND the table carried wide-open policies (roles = {public},
-- qual = true) for SELECT/INSERT/UPDATE/DELETE — so the public anon key could
-- read/modify all customer PII. Enable RLS, drop the public policies, and add
-- authenticated-only policies (matching every other table). Idempotent-ish:
-- DROP … will error if already removed — safe to ignore per statement.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to customers"   ON public.customers;
DROP POLICY IF EXISTS "Allow insert access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow update access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow delete access to customers" ON public.customers;

DROP POLICY IF EXISTS "Allow authenticated users to read customers"   ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON public.customers;

CREATE POLICY "Allow authenticated users to read customers"   ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert customers" ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update customers" ON public.customers FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete customers" ON public.customers FOR DELETE USING (auth.role() = 'authenticated');
