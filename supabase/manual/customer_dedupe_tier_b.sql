-- ============================================================================
-- Customer de-dup — Tier B (real customers with leads/jobs). MANUAL, Supabase.
-- Decisions confirmed by user 2026-10-19. Explicit IDs — run once.
-- Runs as ONE DO block (a single statement) — the Supabase editor does not keep
-- helper tables between statements. Any error → nothing changes.
-- Expected after: customers = 1719, backed_up = 558, dangling = 0.
-- Leads / won jobs / activities are re-pointed to the keeper; customer_name
-- text on leads/jobs is left as-is. Backup → customers_merge_backup.
-- Expected: 32 rows merged + 2 test rows deleted → 1753 - 34 = 1719 customers.
-- ============================================================================

DO $merge$
BEGIN
DROP TABLE IF EXISTS customers_merge_map;

CREATE TEMP TABLE customers_merge_map (dup_id text PRIMARY KEY, keeper_id text NOT NULL);
INSERT INTO customers_merge_map (dup_id, keeper_id) VALUES
  -- 1. ทศภาค – คุณไอซ์ → บริษัท ทศภาค จำกัด
  ('cust-1780649281800','cust-1781498893374'), ('cust-1781498820562','cust-1781498893374'),
  ('cust-1782489632180','cust-1781498893374'), ('cust-1782489661669','cust-1781498893374'),
  ('cust-1785840379924','cust-1781498893374'), ('cust-1785840400268','cust-1781498893374'),
  ('cust-1786004940780','cust-1781498893374'), ('cust-1786004975271','cust-1781498893374'),
  ('cust-1786952747961','cust-1781498893374'), ('cust-1789960510065','cust-1781498893374'),
  ('cust-1781839830595','cust-1781498893374'), ('cust-1785840414183','cust-1781498893374'),
  ('cust-1786004355153','cust-1781498893374'), ('cust-1787489454805','cust-1781498893374'),
  ('cust-1782362456145','cust-1781498893374'), ('cust-1782362481495','cust-1781498893374'),
  ('cust-1783421025703','cust-1781498893374'), ('cust-1785819783589','cust-1781498893374'),
  -- 3. GMM – คุณเอิร์ธ
  ('cust-1781498750777','cust-1782476334322'),
  -- 4. GMM – คุณแท๊บ (keeper renamed below)
  ('cust-1780641160687','cust-1780648710871'), ('cust-1784524594637','cust-1780648710871'),
  ('cust-1784524695253','cust-1780648710871'),
  -- 6. Chubb
  ('cust-1780647651768','cust-1780648011007'),
  -- 7+8. Adidas ×2 → บริษัท โซลโฟร์สตรีท จำกัด (แตงกวา)
  ('cust-1780648255186','cust-1785955822283'), ('cust-1780647884940','cust-1785955822283'),
  -- 9. เซทเลอร์ – คุณป้อน
  ('cust-1791953705733','cust-1782210570799'),
  -- 11. ดิ ออล เวย์
  ('cust-1782999855221','cust-1783052916384'),
  -- 12. บอนดูบา – คุณจ๋า
  ('cust-1785925537990','cust-1785925536997'), ('cust-1785926542520','cust-1785925536997'),
  -- 14. คุณปิ่น
  ('cust-1787631612870','cust-1787545146355'), ('cust-1787632878579','cust-1787545146355'),
  -- 15. Aespa → บริษัท เอสเอ็ม ทรู จำกัด (คุณเจษ)
  ('cust-1780649902468','cust-1782920867820');

-- Backup merged rows + the 2 test rows
CREATE TABLE IF NOT EXISTS customers_merge_backup AS
  SELECT c.*, now() AS merged_at, ''::text AS merged_into FROM customers c WHERE false;
INSERT INTO customers_merge_backup
  SELECT c.*, now(), m.keeper_id FROM customers c JOIN customers_merge_map m ON m.dup_id = c.customer_id;
INSERT INTO customers_merge_backup
  SELECT c.*, now(), 'DELETED-TEST' FROM customers c
  WHERE c.customer_id IN ('cust-1780375456304','cust-1783421789007');

-- Fill keeper's empty fields; append differing phones / contact names to Notes
UPDATE customers k SET
  contact_person      = coalesce(nullif(k.contact_person,''),      d.contact_person),
  phone               = coalesce(nullif(k.phone,''),               d.phone),
  email               = coalesce(nullif(k.email,''),               d.email),
  line_id             = coalesce(nullif(k.line_id,''),             d.line_id),
  tax_id              = coalesce(nullif(k.tax_id,''),              d.tax_id),
  company_address     = coalesce(nullif(k.company_address,''),     d.company_address),
  bank_name           = coalesce(nullif(k.bank_name,''),           d.bank_name),
  bank_account_number = coalesce(nullif(k.bank_account_number,''), d.bank_account_number),
  bank_account_name   = coalesce(nullif(k.bank_account_name,''),   d.bank_account_name),
  notes = nullif(concat_ws(E'\n', nullif(k.notes,''),
            CASE WHEN d.other_phones <> '' THEN 'Merged — other phones: ' || d.other_phones END,
            CASE WHEN d.other_names  <> '' THEN 'Merged — other names: '  || d.other_names  END,
            nullif(d.notes,'')), ''),
  updated_at = now()
FROM (
  SELECT m.keeper_id,
    max(nullif(c.contact_person,'')) contact_person, max(nullif(c.phone,'')) phone,
    max(nullif(c.email,'')) email, max(nullif(c.line_id,'')) line_id, max(nullif(c.tax_id,'')) tax_id,
    max(nullif(c.company_address,'')) company_address, max(nullif(c.bank_name,'')) bank_name,
    max(nullif(c.bank_account_number,'')) bank_account_number, max(nullif(c.bank_account_name,'')) bank_account_name,
    string_agg(DISTINCT nullif(c.notes,''), E'\n') notes,
    coalesce(string_agg(DISTINCT c.phone, ', ') FILTER (WHERE coalesce(c.phone,'') NOT IN ('', '0')
      AND regexp_replace(c.phone,'\D','','g') <> regexp_replace(coalesce(k2.phone,''),'\D','','g')), '') other_phones,
    coalesce(string_agg(DISTINCT c.company_name, ', ') FILTER (WHERE c.company_name <> k2.company_name), '') other_names
  FROM customers_merge_map m
  JOIN customers c  ON c.customer_id  = m.dup_id
  JOIN customers k2 ON k2.customer_id = m.keeper_id
  GROUP BY m.keeper_id
) d
WHERE k.customer_id = d.keeper_id;

-- #4 rename GMM keeper
UPDATE customers SET company_name = 'บริษัท จีเอ็มเอ็ม แกรมมี่ จำกัด (มหาชน)', updated_at = now()
WHERE customer_id = 'cust-1780648710871';

-- Re-point links
UPDATE lead_opportunities t SET customer_id = m.keeper_id FROM customers_merge_map m WHERE t.customer_id = m.dup_id;
UPDATE won_jobs           t SET customer_id = m.keeper_id FROM customers_merge_map m WHERE t.customer_id = m.dup_id;
UPDATE activities         t SET entity_id   = m.keeper_id FROM customers_merge_map m
  WHERE t.entity_type = 'customer' AND t.entity_id = m.dup_id;

-- Remove duplicates + test rows (test rows have no leads/jobs)
DELETE FROM customers c USING customers_merge_map m WHERE c.customer_id = m.dup_id;
DELETE FROM customers WHERE customer_id IN ('cust-1780375456304','cust-1783421789007');

DROP TABLE customers_merge_map;
END
$merge$;

-- CHECK: dangling should be 0
SELECT (SELECT count(*) FROM customers) AS customers,
       (SELECT count(*) FROM customers_merge_backup) AS backed_up,
       (SELECT count(*) FROM lead_opportunities l WHERE l.customer_id <> '' AND l.customer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = l.customer_id)) AS dangling_leads,
       (SELECT count(*) FROM won_jobs j WHERE j.customer_id <> '' AND j.customer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = j.customer_id)) AS dangling_jobs;

