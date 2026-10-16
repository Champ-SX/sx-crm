-- Won board: new built-in column "OP-จบงาน" (OP_EVENT_DONE) between
-- "OP - พร้อมออกงาน" and "OP - wait Staff / Payment / Doc [TERR]".
-- Built-in stages keep their order/colour in dynamic_op_stages; this slots the
-- new one in right before the wait-payment column. Safe to re-run.
DO $$
DECLARE w int; b text;
BEGIN
  IF EXISTS (SELECT 1 FROM dynamic_op_stages WHERE stage_id = 'OP_EVENT_DONE') THEN RETURN; END IF;
  SELECT "order", board_id INTO w, b FROM dynamic_op_stages WHERE stage_id = 'OP_WAIT_STAFF_PAYMENT_DOC_TERR' LIMIT 1;
  IF w IS NULL THEN RETURN; END IF;   -- built-ins not stored → app's default order already places it
  UPDATE dynamic_op_stages SET "order" = "order" + 1 WHERE "order" >= w;
  INSERT INTO dynamic_op_stages (stage_id, label, "order", accent_color, dot_color, header_bg, column_bg, is_custom, board_id)
  VALUES ('OP_EVENT_DONE', 'OP-จบงาน', w, 'border-t-violet-400', 'bg-violet-400', 'bg-violet-50/60', 'bg-violet-50/20', false, b);
END $$;
