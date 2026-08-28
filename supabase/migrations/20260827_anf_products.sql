-- ANF — product catalog (SKU), Phase 1: schema + non-destructive backfill.
-- Creates anf_products and links anf_stock / anf_orders via product_id.
-- Backfill makes ONE product per distinct current item name (NO merging yet —
-- de-dup is a separate, human-reviewed step). Safe to run more than once.

-- 1. products (the SKUs)
CREATE TABLE IF NOT EXISTS anf_products (
  product_id  text PRIMARY KEY,
  board_id    text NOT NULL DEFAULT 'anf-order',
  name        text NOT NULL,
  code        text,          -- spec / description (was anf_stock.description)
  category    text,          -- paper | cartridge | ink | sleeve | other | custom
  unit        text,          -- box | pack | pcs (optional)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anf_products_board ON anf_products (board_id);

ALTER TABLE anf_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read anf_products"  ON anf_products FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write anf_products" ON anf_products FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. link columns (nullable; app fills them going forward)
ALTER TABLE anf_stock  ADD COLUMN IF NOT EXISTS product_id text REFERENCES anf_products(product_id);
ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS product_id text REFERENCES anf_products(product_id);
CREATE INDEX IF NOT EXISTS idx_anf_stock_product  ON anf_stock  (product_id);
CREATE INDEX IF NOT EXISTS idx_anf_orders_product ON anf_orders (product_id);

-- 3. backfill — one product per distinct stock item name (grouped by board).
--    Picks the first non-null code/category found for that name.
INSERT INTO anf_products (product_id, board_id, name, code, category)
SELECT gen_random_uuid()::text,
       coalesce(board_id, 'anf-order') AS board_id,
       item,
       (array_agg(description) FILTER (WHERE description IS NOT NULL))[1] AS code,
       (array_agg(category)    FILTER (WHERE category    IS NOT NULL))[1] AS category
FROM anf_stock
WHERE item IS NOT NULL AND product_id IS NULL
GROUP BY coalesce(board_id, 'anf-order'), item;

UPDATE anf_stock s
   SET product_id = p.product_id
  FROM anf_products p
 WHERE s.product_id IS NULL
   AND p.name = s.item
   AND p.board_id = coalesce(s.board_id, 'anf-order');

-- 4. backfill orders — reuse the stock product where the name matches; otherwise
--    create a product for order-only items.
INSERT INTO anf_products (product_id, board_id, name, code, category)
SELECT gen_random_uuid()::text,
       coalesce(o.board_id, 'anf-order') AS board_id,
       o.item,
       (array_agg(o.description) FILTER (WHERE o.description IS NOT NULL))[1] AS code,
       NULL
FROM anf_orders o
WHERE o.item IS NOT NULL AND o.product_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM anf_products p
     WHERE p.name = o.item AND p.board_id = coalesce(o.board_id, 'anf-order')
  )
GROUP BY coalesce(o.board_id, 'anf-order'), o.item;

UPDATE anf_orders o
   SET product_id = p.product_id
  FROM anf_products p
 WHERE o.product_id IS NULL
   AND p.name = o.item
   AND p.board_id = coalesce(o.board_id, 'anf-order');
