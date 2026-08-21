-- ANF Stock — group items by category (Paper / Ink cartridge / Ink / Sleeve /
-- Other). Adds a category column and back-classifies existing rows by keyword.
-- Safe to run more than once.

ALTER TABLE anf_stock ADD COLUMN IF NOT EXISTS category text;

-- Back-classify existing rows. Precedence matters: ตลับ (cartridge) is checked
-- before หมึก (ink) because "ตลับซับหมึก" contains both.
UPDATE anf_stock SET category = CASE
  WHEN item ILIKE '%ตลับ%'                                    THEN 'cartridge'
  WHEN item ILIKE '%หมึก%'                                    THEN 'ink'
  WHEN item ILIKE '%ซอง%'                                     THEN 'sleeve'
  WHEN item ILIKE '%กระดาษ%' OR item ILIKE '%ฟิล%'
    OR item ILIKE '%กรอบ%'  OR item ILIKE '%สติ๊กเกอร์%'
    OR item ILIKE '%ปริ้น%'                                    THEN 'paper'
  ELSE 'other'
END
WHERE category IS NULL;
