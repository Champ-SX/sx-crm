-- The Purchasing board is now called Inventory (buying + warehouse + event equipment).
-- Display name only: board_id stays 'anf-order', no rows change.
UPDATE boards SET name = 'Inventory' WHERE board_id = 'anf-order';
