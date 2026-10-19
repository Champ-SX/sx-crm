-- ============================================================================
-- Customer de-dup — Tier A (exact import copies). MANUAL, run in Supabase.
-- NOT a migration. Backlogged 2026-10-16.
--
-- Scope: same cleaned company name AND same email. Preview (2026-10-16):
--   321 groups · 524 rows removed · 0 removed rows have leads/jobs · 2276 → 1752
--
-- HOW TO RUN: paste the whole file and run once. The Supabase SQL editor runs
--   the whole script as ONE transaction — any error = nothing changes.
--   Expect backed_up = 524, customers = 1752 (adjusted for customers added since).
--   (No TEMP table / BEGIN-COMMIT: the editor drops temp tables between statements.)
-- Re-run the preview query first if lots of time has passed.
-- UNDO: rows are in customers_merge_backup (merged_into = keeper id).
-- ============================================================================
DROP TABLE IF EXISTS customers_merge_map;
CREATE TABLE customers_merge_map AS
WITH c AS (
  SELECT cu.customer_id, cu.created_at,
    regexp_replace(regexp_replace(lower(coalesce(cu.company_name,'')),
      '(บริษัท|จำกัด|\(มหาชน\)|มหาชน|ห้างหุ้นส่วนจำกัด|หจก\.?|ประเทศไทย|co\.?|ltd\.?|limited|company|corporation|corp\.?|inc\.?|public|\(thailand\)|thailand)','','g'),
      '[^a-z0-9ก-๙]','','g') AS name_key,
    nullif(lower(trim(coalesce(cu.email,''))),'') AS email_key,
    (SELECT count(*) FROM lead_opportunities l WHERE l.customer_id = cu.customer_id)
  + (SELECT count(*) FROM won_jobs j WHERE j.customer_id = cu.customer_id) AS links
  FROM customers cu
),
g AS (
  SELECT *, first_value(customer_id) OVER w AS keeper_id, row_number() OVER w AS rn
  FROM c WHERE email_key LIKE '%@%' AND length(name_key) >= 1
  WINDOW w AS (PARTITION BY name_key, email_key ORDER BY links DESC, created_at)
)
SELECT customer_id AS dup_id, keeper_id FROM g WHERE rn > 1;

CREATE TABLE IF NOT EXISTS customers_merge_backup AS
  SELECT c.*, now() AS merged_at, ''::text AS merged_into FROM customers c WHERE false;
INSERT INTO customers_merge_backup
  SELECT c.*, now(), m.keeper_id FROM customers c JOIN customers_merge_map m ON m.dup_id = c.customer_id;

UPDATE customers k SET
  contact_person      = coalesce(nullif(k.contact_person,''),      d.contact_person),
  phone               = coalesce(nullif(k.phone,''),               d.phone),
  line_id             = coalesce(nullif(k.line_id,''),             d.line_id),
  social              = coalesce(nullif(k.social,''),              d.social),
  tax_id              = coalesce(nullif(k.tax_id,''),              d.tax_id),
  company_address     = coalesce(nullif(k.company_address,''),     d.company_address),
  branch              = coalesce(nullif(k.branch,''),              d.branch),
  billing_contact     = coalesce(nullif(k.billing_contact,''),     d.billing_contact),
  bank_name           = coalesce(nullif(k.bank_name,''),           d.bank_name),
  bank_account_number = coalesce(nullif(k.bank_account_number,''), d.bank_account_number),
  bank_account_name   = coalesce(nullif(k.bank_account_name,''),   d.bank_account_name),
  notes               = coalesce(nullif(k.notes,''),               d.notes),
  updated_at          = now()
FROM (
  SELECT m.keeper_id,
    max(nullif(c.contact_person,'')) contact_person, max(nullif(c.phone,'')) phone,
    max(nullif(c.line_id,'')) line_id, max(nullif(c.social,'')) social,
    max(nullif(c.tax_id,'')) tax_id, max(nullif(c.company_address,'')) company_address,
    max(nullif(c.branch,'')) branch, max(nullif(c.billing_contact,'')) billing_contact,
    max(nullif(c.bank_name,'')) bank_name, max(nullif(c.bank_account_number,'')) bank_account_number,
    max(nullif(c.bank_account_name,'')) bank_account_name, max(nullif(c.notes,'')) notes
  FROM customers_merge_map m JOIN customers c ON c.customer_id = m.dup_id
  GROUP BY m.keeper_id
) d
WHERE k.customer_id = d.keeper_id;

UPDATE lead_opportunities t SET customer_id = m.keeper_id FROM customers_merge_map m WHERE t.customer_id = m.dup_id;
UPDATE won_jobs           t SET customer_id = m.keeper_id FROM customers_merge_map m WHERE t.customer_id = m.dup_id;
UPDATE activities         t SET entity_id   = m.keeper_id FROM customers_merge_map m
  WHERE t.entity_type = 'customer' AND t.entity_id = m.dup_id;

DELETE FROM customers c USING customers_merge_map m WHERE c.customer_id = m.dup_id;

-- CHECK
SELECT (SELECT count(*) FROM customers_merge_backup) AS backed_up,
       (SELECT count(*) FROM customers)              AS customers;

DROP TABLE customers_merge_map;
