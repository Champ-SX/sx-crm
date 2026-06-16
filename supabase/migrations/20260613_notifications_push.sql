-- Phase 2.4: Persist notifications + push subscriptions

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT       NOT NULL,
  actor         TEXT        NOT NULL,
  entity_type   TEXT        NOT NULL CHECK (entity_type IN ('customer', 'lead_opportunity', 'won_job')),
  entity_id     TEXT        NOT NULL,
  entity_name   TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  read          BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Each user reads only their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- Any signed-in user can create a notification (needed for @mention actor)
CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can mark their own notifications read
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, read, created_at DESC);

-- ── push_subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner manages their own subscription
CREATE POLICY "push_subscriptions_own"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- Any authenticated user can read subscriptions (needed to send push to recipient)
CREATE POLICY "push_subscriptions_select_authenticated"
  ON push_subscriptions FOR SELECT
  USING (auth.role() = 'authenticated');
