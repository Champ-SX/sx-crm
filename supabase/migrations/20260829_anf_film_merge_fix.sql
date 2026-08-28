-- ANF de-dup: film group #2 didn't match by Thai name literal in 20260828
-- (paste mangled a combining char), so it survived. This merges the two film
-- products by their shared code instead (robust). Safe to re-run (no-op once
-- only one product carries the code).

DO $$
DECLARE keep_id text; drop_id text;
        cname text := 'ฟิล์มสไลด์ (ใส)';
        ccode text := 'PAPER CANON FILM 4*6';
BEGIN
  SELECT product_id INTO keep_id FROM anf_products
    WHERE code = ccode ORDER BY char_length(name) ASC, product_id LIMIT 1;
  SELECT product_id INTO drop_id FROM anf_products
    WHERE code = ccode AND product_id <> keep_id ORDER BY product_id LIMIT 1;
  IF keep_id IS NULL OR drop_id IS NULL THEN RETURN; END IF;

  UPDATE anf_orders SET product_id = keep_id WHERE product_id = drop_id;

  UPDATE anf_stock k
     SET qty = k.qty + d.qty,
         delivered_at = GREATEST(k.delivered_at, d.delivered_at),
         checked_at   = GREATEST(k.checked_at, d.checked_at),
         room = COALESCE(k.room, d.room), sign = COALESCE(k.sign, d.sign),
         checked_by = COALESCE(k.checked_by, d.checked_by)
    FROM anf_stock d
   WHERE k.product_id = keep_id AND d.product_id = drop_id
     AND COALESCE(k.branch,'') = COALESCE(d.branch,'');

  DELETE FROM anf_stock d WHERE d.product_id = drop_id
     AND EXISTS (SELECT 1 FROM anf_stock k WHERE k.product_id = keep_id
                   AND COALESCE(k.branch,'') = COALESCE(d.branch,''));

  UPDATE anf_stock SET product_id = keep_id WHERE product_id = drop_id;

  UPDATE anf_stock    SET item = cname, description = ccode WHERE product_id = keep_id;
  UPDATE anf_orders   SET item = cname, description = ccode WHERE product_id = keep_id;
  UPDATE anf_products SET name = cname, code = ccode, updated_at = now() WHERE product_id = keep_id;

  DELETE FROM anf_products WHERE product_id = drop_id;
END $$;
