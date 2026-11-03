-- Copy the sheet's "AW Detail / Link" column into each imported supplier's notes.
-- Appends (keeps what's there); skips if already added. Safe to re-run.
with src(id, txt) as (values
  ('sup-imp-001', E'AW - Andy ซองใสใส่รูป\nClear OPP / White Color Screen\nสกรีนคำและ Logo สีขาว\nSize ซอง : H 16.5 x W 11 cm\n( For 4x6 Photo )\nhttps://drive.google.com/open?id=1BjOG734ACnVIXYEFXlZEUyV0Zi0OFgG5&usp=drive_fs'),
  ('sup-imp-002', 'https://s.shopee.co.th/6VNPqVLzpu?share_channel_code=6'),
  ('sup-imp-003', 'https://s.shopee.co.th/8plKcPHrJG?share_channel_code=6'),
  ('sup-imp-004', 'https://s.shopee.co.th/4VcLSOe6Wo?share_channel_code=6'),
  ('sup-imp-005', 'https://s.shopee.co.th/1BLtUkJQv2?share_channel_code=6'),
  ('sup-imp-006', 'https://www.alibaba.com/product-detail/Alloy-Wedding-Bouquet-Photo-Charms-'),
  ('sup-imp-007', 'https://www.facebook.com/Siam.digital.Siamsquare/'))
update anf_suppliers s
set notes = case when coalesce(s.notes, '') = '' then src.txt else s.notes || E'\n\n' || src.txt end,
    updated_at = now()
from src
where s.supplier_id = src.id
  and position(src.txt in coalesce(s.notes, '')) = 0;
