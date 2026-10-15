-- Rename the "ANF Order" board to "Order" (id/slug stay 'anf-order'). Safe to re-run.
UPDATE boards SET name = 'Order' WHERE board_id = 'anf-order';
