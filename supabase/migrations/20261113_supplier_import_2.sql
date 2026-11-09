-- Import round 2 from the "ORDER TRACKER" Google Sheet: 6 new suppliers + their items.
-- Duplicate-safe: a supplier is skipped when one with the same name already exists
-- (case, spaces and punctuation ignored), and items reuse an existing same-name item.
-- Rows SUP-001…007 in the sheet were imported by 20261110 and are not touched. Safe to re-run.

drop table if exists imp;
create temp table imp(n int, sid text, name text, channels text[], line_id text, website text, notes text,
                      item text, unit text, price numeric, url text, spec text);
insert into imp values
 (1,'sup-imp-008','ส.ไทยสงวนอุปกรณ์การพิมพ์','{LINE}','@stssticker','https://line.me/R/ti/p/@stssticker',null,
    'กระดาษสติ้กเกอร์','ใบ',null,null,E'สติกเกอร์ PP ขาวเงา อิงค์เจ็ท\n19" × 13" · 1,000 แผ่น'),
 (2,'sup-imp-009','Nails Content รวมเรื่องเล็บ','{Shopee}',null,null,null,
    'น้ำยาทาเล็บ ขวดสีเขียว','ขวด',79,'https://shopee.co.th/product/7516598/18356231351',null),
 (3,'sup-imp-010','wemass','{Shopee}',null,null,null,
    'ถุงซิปล็อก PVC ใส 12*8 นิ้ว','แพ็ก',null,'https://s.shopee.co.th/5As2FgVtWs',null),
 (4,'sup-imp-011','UHU Official Store','{Shopee}',null,null,null,
    'UHU กาวอเนกประสงค์','หลอด',18,'https://shopee.co.th/product/734282381/10291951165',null),
 (5,'sup-imp-012','SCT PAPER','{LINE}','@sctpaper','https://line.me/R/ti/p/@sctpaper',null,
    'กระดาษ A3 ถนอมสายตา สีเหลือง 75G','ใบ',null,null,'Usual order: 2,500 sheets'),
 (6,'sup-imp-013','Srisuwan เตาปูน-บางซื่อ','{Shopee}',null,null,null,
    'MORN SUN 48443 มีดพับกระดาษ',null,null,'https://shopee.co.th/product/256423070/43002016860',null);

-- normalised name, used for the duplicate check
create or replace function pg_temp.nm(t text) returns text language sql immutable
  as $$ select regexp_replace(lower(coalesce(t,'')), '[^[:alnum:]ก-๙]', '', 'g') $$;

-- Suppliers: new codes continue after the highest SUP-### in use.
insert into anf_suppliers (supplier_id, board_id, code, name, channels, line_id, website, notes)
select i.sid, 'anf-order',
       'SUP-' || lpad((coalesce((select max(substring(code from '^SUP-(\d+)$')::int) from anf_suppliers), 0)
                       + row_number() over (order by i.n))::text, 3, '0'),
       i.name, i.channels, i.line_id, i.website, i.notes
from imp i
where not exists (select 1 from anf_suppliers s where pg_temp.nm(s.name) = pg_temp.nm(i.name))
  and not exists (select 1 from anf_suppliers s where s.supplier_id = i.sid);

-- Items: reuse one with the same name, else create it.
insert into anf_products (product_id, board_id, name, category, unit, kind)
select 'prd-imp-' || lpad((i.n + 7)::text, 3, '0'), 'anf-order', i.item, 'other', i.unit, 'supply'
from imp i
where not exists (select 1 from anf_products p where pg_temp.nm(p.name) = pg_temp.nm(i.item))
on conflict (product_id) do nothing;

-- Link item ↔ supplier (to the existing supplier if it was a duplicate).
insert into anf_product_suppliers (id, product_id, supplier_id, preferred, price, unit, product_url, spec)
select 'lnk-imp-' || lpad((i.n + 7)::text, 3, '0'),
       (select p.product_id from anf_products p where pg_temp.nm(p.name) = pg_temp.nm(i.item) order by p.created_at nulls last limit 1),
       (select s.supplier_id from anf_suppliers s where pg_temp.nm(s.name) = pg_temp.nm(i.name) order by s.created_at nulls last limit 1),
       not exists (select 1 from anf_product_suppliers x join anf_products p on p.product_id = x.product_id where pg_temp.nm(p.name) = pg_temp.nm(i.item)),
       i.price, i.unit, i.url, i.spec
from imp i
on conflict do nothing;

-- Result: each sheet row and the supplier it ended up on (new = sup-imp-…, else it matched an existing one).
select i.name as sheet_name, s.code, s.name as supplier_in_crm,
       case when s.supplier_id = i.sid then 'added' else 'already existed' end as result
from imp i left join anf_suppliers s on pg_temp.nm(s.name) = pg_temp.nm(i.name)
order by i.n;
