-- The Order board is now called Purchasing. Display name only:
-- board_id stays 'anf-order' so no request, PO or stock row changes.
UPDATE boards SET name = 'Purchasing' WHERE board_id = 'anf-order';
