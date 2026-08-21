-- ANF Stock — per-branch inventory that shares the item catalog with anf_orders.
-- Adds the Stock⇄Order loop columns to anf_orders, creates anf_stock, and seeds
-- it by importing the existing [ANF] Stock workbook (BACC / BTT / OFFICE).

-- 1. Order→Stock loop columns ------------------------------------------------
ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS received_at   DATE;
ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS received_qty  INTEGER;
ALTER TABLE anf_orders ADD COLUMN IF NOT EXISTS stock_id      TEXT;

-- 2. anf_stock ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anf_stock (
  stock_id     TEXT PRIMARY KEY,
  board_id     TEXT NOT NULL DEFAULT 'anf-order',
  item         TEXT NOT NULL,
  product_code TEXT,
  branch       TEXT,
  room         TEXT,
  qty          INTEGER NOT NULL DEFAULT 0,
  alert_qty    INTEGER,
  alert_unit   TEXT,
  checked_at   DATE,
  reported_at  DATE,
  delivered_at DATE,
  notes        TEXT,
  sign         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anf_stock_board  ON anf_stock (board_id);
CREATE INDEX IF NOT EXISTS idx_anf_stock_branch ON anf_stock (branch);

ALTER TABLE anf_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anf_stock all" ON anf_stock;
CREATE POLICY "anf_stock all" ON anf_stock FOR ALL USING (true) WITH CHECK (true);

-- 3. Seed — imported from [ANF] Stock.xlsx -----------------------------------
INSERT INTO anf_stock (stock_id, board_id, item, product_code, branch, room, qty, alert_qty, alert_unit, checked_at, reported_at, delivered_at, notes, sign) VALUES
  ('stk-bacc-001', 'anf-order', 'กระดาษปริ้นท์ RX1', 'PAPER DNP RX1 4*6', 'BACC', 'A64/A65/A66/BACC Fl.5', 2, 2, 'BOXES', '2026-08-18', '2026-08-09', '2026-08-18', 'มาส่ง 1 กล่อง', 'Bank'),
  ('stk-bacc-002', 'anf-order', 'กระดาษปริ้นท์ RX1 A60', 'PAPER DNP RX1 5*7', 'BACC', 'A60', 3, 1, 'BOXES', '2026-08-16', '2026-07-12', '2026-08-05', 'มาส่ง 3 กล่อง', 'Bank'),
  ('stk-bacc-003', 'anf-order', 'กระดาษฟิล​มสไลด์ (ใส)', 'PAPER CANON FILM 4*6', 'BACC', 'A63', 27, 10, 'PACKS', '2026-08-16', '2026-08-09', '2026-08-18', '20 packs', 'Bank'),
  ('stk-bacc-004', 'anf-order', 'กระดาษปริ้นท์ใหญ่', NULL, 'BACC', 'A62', 4, 4, 'PACKS', '2026-08-18', '2026-08-17', '2026-07-15', '12 packs', 'Nuii'),
  ('stk-bacc-005', 'anf-order', 'กระดาษปริ้นสติ๊กเกอร์', NULL, 'BACC', 'A61', 1, 4, 'PACKS', '2026-08-16', '2026-07-05', NULL, NULL, NULL),
  ('stk-bacc-006', 'anf-order', 'ตลับซับหมึก canon (A63)', 'INK PAD CANON  MC-G02', 'BACC', 'A63', 2, 1, 'PCS', '2026-08-16', '2026-02-02', '2026-07-02', 'มาส่ง 2 กล่อง', 'Mind'),
  ('stk-bacc-007', 'anf-order', 'หมึก canon (A63) : BK', 'INK CANON BK GI-73', 'BACC', 'A63', 4, 2, NULL, '2026-08-16', '2026-05-17', '2026-07-02', 'มาส่ง 2 ขวด', 'Mind'),
  ('stk-bacc-008', 'anf-order', 'หมึก canon (A63) : GY', 'INK CANON GY GI-73', 'BACC', 'A63', 3, 2, NULL, '2026-08-16', '2026-04-26', '2026-07-02', 'มาส่ง 3 ขวด', 'Mind'),
  ('stk-bacc-009', 'anf-order', 'หมึก canon (A63) : R', 'INK CANON R  GI-73', 'BACC', 'A63', 5, 2, NULL, '2026-08-16', '2026-04-26', '2026-07-02', 'มาส่ง 2 ขวด', 'Mind'),
  ('stk-bacc-010', 'anf-order', 'หมึก canon (A63) : Y', 'INK CANON Y  GI-73', 'BACC', 'A63', 6, 2, NULL, '2026-08-16', '2025-12-14', '2026-07-02', NULL, 'Mind'),
  ('stk-bacc-011', 'anf-order', 'หมึก canon (A63) : M', 'INK CANON M  GI-73', 'BACC', 'A63', 3, 2, NULL, '2026-08-16', NULL, '2026-07-02', 'มาส่ง 1 ขวด', 'Mind'),
  ('stk-bacc-012', 'anf-order', 'หมึก canon (A63) : C', 'INK CANON C  GI-73', 'BACC', 'A63', 7, 2, NULL, '2026-08-16', NULL, '2026-07-02', 'มาส่ง 1 ขวด', 'Mind'),
  ('stk-bacc-013', 'anf-order', 'กรอบฟิล์มใส (ดำ)', 'PAPER FRAME BLACK', 'BACC', 'A63', 59, 10, 'PACKS', '2026-08-16', '2026-04-12', '2026-04-25', 'มาส่ง 64 ชุด', 'Bank'),
  ('stk-bacc-014', 'anf-order', 'กรอบฟิล์มใส (ฟ้า)', 'PAPER FRAME SKY', 'BACC', 'A63', 0, 5, 'PACKS', '2026-08-16', NULL, NULL, NULL, NULL),
  ('stk-bacc-015', 'anf-order', 'ซองใส ใส่รูป', 'ANDY PHOTO WALLET', 'BACC', 'All', 5, 4, 'PACKS', '2026-08-16', '2025-12-24', '2026-05-20', 'มาส่ง 8 แพ็ค', 'Gam'),
  ('stk-btt-016', 'anf-order', 'กระดาษปริ้นท์ RX1', 'PAPER DNP RX1 4*6', 'BTT', 'B82/B84/B85', 2, 1, 'BOXES', '2026-08-16', '2026-08-02', '2026-04-21', 'มาส่ง 2 กล่อง', 'Bank'),
  ('stk-btt-017', 'anf-order', 'กระดาษปริ้นท์ RX1 ปรุ', 'PAPER DNP RX1 4*6 (Perforate)', 'BTT', 'B83', 2, 1, 'BOXES', '2026-08-16', NULL, NULL, 'มาส่ง 1 กล่อง', NULL),
  ('stk-btt-018', 'anf-order', 'กระดาษปริ้นด้าน 4*6', 'PLATINUM LAB PHOTO PAPER', 'BTT', 'B80/B81/B86', 2, 2, 'PACKS', '2026-08-16', '2026-08-09', '2026-03-19', 'มาส่ง 5 แพ็ค', NULL),
  ('stk-btt-019', 'anf-order', 'ตลับซับหมึก canon (A63)', 'INK PAD CANON  MC-G02', 'BTT', 'B80/B81/B86', 1, 1, 'PCS', '2026-08-16', NULL, NULL, NULL, NULL),
  ('stk-btt-020', 'anf-order', 'หมึก canon (A63) : BK', 'INK CANON BK GI-73', 'BTT', 'B80/B81/B86', 4, 2, NULL, '2026-08-16', '2026-04-26', NULL, NULL, NULL),
  ('stk-btt-021', 'anf-order', 'หมึก canon (A63) : GY', 'INK CANON GY GI-73', 'BTT', 'B80/B81/B86', 3, 2, NULL, '2026-08-16', NULL, NULL, NULL, NULL),
  ('stk-btt-022', 'anf-order', 'หมึก canon (A63) : R', 'INK CANON R  GI-73', 'BTT', 'B80/B81/B86', 3, 2, NULL, '2026-08-16', '2026-06-21', NULL, NULL, NULL),
  ('stk-btt-023', 'anf-order', 'หมึก canon (A63) : Y', 'INK CANON Y  GI-73', 'BTT', 'B80/B81/B86', 3, 2, NULL, '2026-08-16', '2026-06-21', NULL, NULL, NULL),
  ('stk-btt-024', 'anf-order', 'หมึก canon (A63) : M', 'INK CANON M  GI-73', 'BTT', 'B80/B81/B86', 3, 2, NULL, '2026-08-16', NULL, NULL, NULL, NULL),
  ('stk-btt-025', 'anf-order', 'หมึก canon (A63) : C', 'INK CANON C  GI-73', 'BTT', 'B80/B81/B86', 3, 2, NULL, '2026-08-16', '2026-06-21', NULL, NULL, NULL),
  ('stk-btt-026', 'anf-order', 'ซองใส ใส่รูป', 'ANDY PHOTO WALLET', 'BTT', 'All', 3, 2, 'PACKS', '2026-08-16', '2025-10-28', '2025-12-03', 'มาส่ง 3 แพ็ค', NULL),
  ('stk-office-027', 'anf-order', 'กระดาษปริ้นท์ RX1', 'PAPER DNP RX1 4*6', 'OFFICE', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-028', 'anf-order', 'กระดาษปริ้นท์ RX1 ปรุ', 'PAPER DNP RX1 4*6 (Perforate)', 'OFFICE', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-029', 'anf-order', 'กระดาษปริ้นท์ RX1 A60', 'PAPER DNP RX1 5*7', 'OFFICE', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-030', 'anf-order', 'ฟิล​มสไลด์ (ใส)', 'PAPER CANON FILM 4*6', 'OFFICE', NULL, 18, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-031', 'anf-order', 'กระดาษปริ้นท์ใหญ่', 'PLATINUM LAB PHOTO PAPER', 'OFFICE', NULL, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-032', 'anf-order', 'กระดาษปริ้นด้าน 4*6', 'PLATINUM LAB PHOTO PAPER', 'OFFICE', NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-033', 'anf-order', 'ปริ้นสติ๊กเกอร์', NULL, 'OFFICE', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-034', 'anf-order', 'ตลับซับหมึก canon (A63)', 'INK PAD CANON  MC-G02', 'OFFICE', NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-035', 'anf-order', 'หมึก canon (A63) : BK', 'INK CANON BK GI-73', 'OFFICE', NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-036', 'anf-order', 'หมึก canon (A63) : GY', 'INK CANON GY GI-73', 'OFFICE', NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-037', 'anf-order', 'หมึก canon (A63) : R', 'INK CANON R  GI-73', 'OFFICE', NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-038', 'anf-order', 'หมึก canon (A63) : Y', 'INK CANON Y  GI-73', 'OFFICE', NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-039', 'anf-order', 'หมึก canon (A63) : M', 'INK CANON M  GI-73', 'OFFICE', NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-040', 'anf-order', 'หมึก canon (A63) : C', 'INK CANON C  GI-73', 'OFFICE', NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('stk-office-041', 'anf-order', 'ซองใสใส่รูป', 'ANDY PHOTO WALLET', 'OFFICE', NULL, 12, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (stock_id) DO NOTHING;
