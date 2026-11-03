-- Suppliers: code + channels; item↔supplier: product link + spec.
alter table anf_suppliers
  add column if not exists code     text,
  add column if not exists channels text[] not null default '{}';
alter table anf_product_suppliers
  add column if not exists product_url text,
  add column if not exists spec        text;

-- Import from "SX_Order Supplier List.xlsx" (7 suppliers). Safe to re-run.
insert into anf_suppliers (supplier_id, board_id, code, name, channels, email, line_id, website, notes) values
  ('sup-imp-001', 'anf-order', 'SUP-001', 'Sahasang Plastic',               '{LINE,Email}', 'sahasangplastic@gmail.com', '@ftr6389a', 'https://line.me/R/ti/p/@ftr6389a', 'Custom print. Production 30–45 days.'),
  ('sup-imp-002', 'anf-order', 'SUP-002', 'COZII.TH',                       '{Shopee}', null, null, null, null),
  ('sup-imp-003', 'anf-order', 'SUP-003', 'KS_DIY_SHOP',                    '{Shopee}', null, null, null, null),
  ('sup-imp-004', 'anf-order', 'SUP-004', 'Good Life',                      '{Shopee}', null, null, null, null),
  ('sup-imp-005', 'anf-order', 'SUP-005', 'Nicknakshop',                    '{Shopee}', null, null, null, null),
  ('sup-imp-006', 'anf-order', 'SUP-006', 'Unnamed (Alibaba)',              '{Alibaba}', null, null, null, 'Name missing in the sheet; sheet said Shopee but the link is Alibaba.'),
  ('sup-imp-007', 'anf-order', 'SUP-007', 'Siam Digital Photo (Siam Square)', '{Facebook}', null, null, 'https://www.facebook.com/Siam.digital.Siamsquare/', 'Order via FB inbox.')
on conflict (supplier_id) do nothing;

-- Items: reuse one with the same name, else create it.
with src(pid, name, unit) as (values
  ('prd-imp-001', 'ANF. ซองใสใส่รูป 4*6', 'ชุด'),
  ('prd-imp-002', 'กรอบ ID Card ใส', 'ชิ้น'),
  ('prd-imp-003', 'โซ่ไข่ปลา', 'ชุด'),
  ('prd-imp-004', 'กรอบ ซีดี', 'ชิ้น'),
  ('prd-imp-005', 'พวงกุญแจ รูปหัวใจ', 'ชิ้น'),
  ('prd-imp-006', 'กรอบ พวงกุญแจ pin& play', 'ชิ้น'),
  ('prd-imp-007', 'กลักฟิล์ม', 'ชิ้น'))
insert into anf_products (product_id, board_id, name, category, unit, kind)
select pid, 'anf-order', name, 'other', unit, 'supply' from src
where not exists (select 1 from anf_products p where lower(trim(p.name)) = lower(trim(src.name)))
on conflict (product_id) do nothing;

with src(n, name, url, spec) as (values
  ('001', 'ANF. ซองใสใส่รูป 4*6', null, E'Clear OPP / white screen print — words + logo in white\nSleeve H 16.5 × W 11 cm (for 4×6 photo)\nhttps://drive.google.com/open?id=1BjOG734ACnVIXYEFXlZEUyV0Zi0OFgG5&usp=drive_fs'),
  ('002', 'กรอบ ID Card ใส', 'https://s.shopee.co.th/6VNPqVLzpu', null),
  ('003', 'โซ่ไข่ปลา', 'https://s.shopee.co.th/8plKcPHrJG', null),
  ('004', 'กรอบ ซีดี', 'https://s.shopee.co.th/4VcLSOe6Wo', null),
  ('005', 'พวงกุญแจ รูปหัวใจ', 'https://s.shopee.co.th/1BLtUkJQv2', null),
  ('006', 'กรอบ พวงกุญแจ pin& play', 'https://www.alibaba.com/product-detail/Alloy-Wedding-Bouquet-Photo-Charms-', null),
  ('007', 'กลักฟิล์ม', null, null))
insert into anf_product_suppliers (id, product_id, supplier_id, preferred, product_url, spec, lead_time)
select 'lnk-imp-' || src.n,
       (select p.product_id from anf_products p where lower(trim(p.name)) = lower(trim(src.name)) order by p.created_at nulls last limit 1),
       'sup-imp-' || src.n,
       not exists (select 1 from anf_product_suppliers x join anf_products p on p.product_id = x.product_id where lower(trim(p.name)) = lower(trim(src.name))),
       src.url, src.spec,
       case when src.n = '001' then '30–45 days' end
from src
on conflict do nothing;
