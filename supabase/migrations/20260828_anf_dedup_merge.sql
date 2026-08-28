-- ANF — product catalog Phase 2: one-time, human-approved de-dup merge.
-- Merges duplicate products into a canonical SKU: re-points orders, sums stock
-- quantities per branch (or relabels), normalizes name/code, deletes the loser.
-- Safe to re-run (no-op once a losing name is gone).

CREATE OR REPLACE FUNCTION anf_merge_products(keep_name text, drop_name text, canon_name text, canon_code text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE keep_id text; drop_id text;
BEGIN
  SELECT product_id INTO keep_id FROM anf_products WHERE name = keep_name LIMIT 1;
  SELECT product_id INTO drop_id FROM anf_products WHERE name = drop_name LIMIT 1;
  IF keep_id IS NULL OR drop_id IS NULL OR keep_id = drop_id THEN RETURN; END IF;

  -- orders on the losing product → canonical
  UPDATE anf_orders SET product_id = keep_id, item = canon_name, description = canon_code
   WHERE product_id = drop_id;

  -- stock: fold overlapping branches into the keeper (sum qty, keep newest dates)
  UPDATE anf_stock k
     SET qty          = k.qty + d.qty,
         delivered_at = GREATEST(k.delivered_at, d.delivered_at),
         checked_at   = GREATEST(k.checked_at, d.checked_at),
         room         = COALESCE(k.room, d.room),
         sign         = COALESCE(k.sign, d.sign),
         checked_by   = COALESCE(k.checked_by, d.checked_by)
    FROM anf_stock d
   WHERE k.product_id = keep_id AND d.product_id = drop_id
     AND COALESCE(k.branch,'') = COALESCE(d.branch,'');

  DELETE FROM anf_stock d
   WHERE d.product_id = drop_id
     AND EXISTS (SELECT 1 FROM anf_stock k
                  WHERE k.product_id = keep_id AND COALESCE(k.branch,'') = COALESCE(d.branch,''));

  -- non-overlapping branches → just re-point to the keeper
  UPDATE anf_stock SET product_id = keep_id WHERE product_id = drop_id;

  -- normalize name/code everywhere on the surviving product
  UPDATE anf_stock    SET item = canon_name, description = canon_code WHERE product_id = keep_id;
  UPDATE anf_orders   SET item = canon_name, description = canon_code WHERE product_id = keep_id;
  UPDATE anf_products SET name = canon_name, code = canon_code, updated_at = now() WHERE product_id = keep_id;

  DELETE FROM anf_products WHERE product_id = drop_id;
END $$;

-- 1. sleeve
SELECT anf_merge_products('ซองใส ใส่รูป', 'ซองใสใส่รูป', 'ซองใส ใส่รูป', 'ANDY PHOTO WALLET');
-- 2. film (corrected spelling on canonical)
SELECT anf_merge_products('ฟิลมสไลด์ (ใส)', 'กระดาษฟิลมสไลด์ (ใส)', 'ฟิล์มสไลด์ (ใส)', 'PAPER CANON FILM 4*6');
-- 3. RX1 4*6
SELECT anf_merge_products('กระดาษปริ้นท์ RX1 4*6', 'กระดาษปริ้นท์ RX1', 'กระดาษปริ้นท์ RX1 4*6', 'PAPER DNP RX1 4*6');
-- 4. RX1 5*7 — canonical drops "A60" from the name; A60 goes to ROOM
SELECT anf_merge_products('กระดาษปริ้นท์ RX1 5*7 A60', 'กระดาษปริ้นท์ RX1 A60', 'กระดาษปริ้นท์ RX1 5*7', 'PAPER DNP RX1 5*7');
UPDATE anf_stock
   SET room = COALESCE(NULLIF(room, ''), 'A60')
 WHERE product_id = (SELECT product_id FROM anf_products WHERE name = 'กระดาษปริ้นท์ RX1 5*7' LIMIT 1);

-- 5. NOT a duplicate — two different sizes that shared one code. Keep both,
--    disambiguate the code so they no longer flag as duplicates.
UPDATE anf_products SET code = 'PLATINUM LAB PHOTO PAPER - Matte print, 4×6', updated_at = now()
 WHERE name = 'กระดาษปริ้นด้าน 4*6';
UPDATE anf_products SET code = 'PLATINUM LAB PHOTO PAPER - Big print', updated_at = now()
 WHERE name = 'กระดาษปริ้นท์ใหญ่';

UPDATE anf_stock  SET description = 'PLATINUM LAB PHOTO PAPER - Matte print, 4×6' WHERE item = 'กระดาษปริ้นด้าน 4*6';
UPDATE anf_stock  SET description = 'PLATINUM LAB PHOTO PAPER - Big print'        WHERE item = 'กระดาษปริ้นท์ใหญ่';
UPDATE anf_orders SET description = 'PLATINUM LAB PHOTO PAPER - Matte print, 4×6' WHERE item = 'กระดาษปริ้นด้าน 4*6';
UPDATE anf_orders SET description = 'PLATINUM LAB PHOTO PAPER - Big print'        WHERE item = 'กระดาษปริ้นท์ใหญ่';
