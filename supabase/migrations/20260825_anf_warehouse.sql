-- ANF Stock — warehouse-centric model. OFFICE becomes the central WAREHOUSE:
-- deliveries land here and branches are stocked by transferring out of it.
-- This migration only renames the location; transfer logic lives in the app.
-- Safe to run more than once.

UPDATE anf_stock  SET branch = 'WAREHOUSE' WHERE branch = 'OFFICE';
UPDATE anf_orders SET branch = 'WAREHOUSE' WHERE branch = 'OFFICE';
