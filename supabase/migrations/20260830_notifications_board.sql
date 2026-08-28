-- Per-board notifications: the bell filters to the active board so ANF Order
-- and CAP*TURES never mix. Existing notifications are all CAP*TURES. Re-runnable.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS board_id text;
UPDATE notifications SET board_id = 'captures' WHERE board_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_board ON notifications (recipient_id, board_id);
