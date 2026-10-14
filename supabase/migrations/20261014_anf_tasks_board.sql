-- Andy & Fine. — retail photohouse task board (replaces the Trello
-- "Andy OPERATION" board). Its own tasks table; not Leads / Won jobs.
-- Safe to run more than once.

-- 1. The board, 2nd in the switcher (after CAP*TURES). Restricted boards are
--    only listed for their members (and admins).
ALTER TABLE boards ADD COLUMN IF NOT EXISTS restricted boolean NOT NULL DEFAULT false;
UPDATE boards SET sort_order = 2 WHERE board_id = 'anf-order' AND sort_order < 2;
INSERT INTO boards (board_id, name, slug, color, sort_order, restricted)
VALUES ('anf', 'Andy & Fine.', 'anf', '#FF809E', 1, true)
ON CONFLICT (board_id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order, restricted = true;

-- 2. Who can see a restricted board.
CREATE TABLE IF NOT EXISTS board_members (
  board_id   text NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated read board_members"  ON board_members FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write board_members" ON board_members FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Pick-lists: task types (+ default checklist), branches and rooms.
CREATE TABLE IF NOT EXISTS anf_task_types (
  type_id           text PRIMARY KEY,
  name              text NOT NULL,
  color             text NOT NULL DEFAULT '#888780',
  default_checklist jsonb NOT NULL DEFAULT '[]',   -- ["FRAME","GIF",…]
  is_issue          boolean NOT NULL DEFAULT false, -- shows issue level + area
  sort_order        int NOT NULL DEFAULT 0
);
INSERT INTO anf_task_types (type_id, name, color, default_checklist, is_issue, sort_order) VALUES
  ('frame',       'ลงเฟรม',       '#D4537E', '["FRAME","GIF","PREVIEW","UI"]', false, 1),
  ('rnd',         'R&D',          '#7F77DD', '[]', false, 2),
  ('maintenance', 'Maintenance',  '#1D9E75', '[]', true,  3),
  ('content',     'Content / PR', '#378ADD', '[]', false, 4),
  ('other',       'Other',        '#888780', '[]', false, 9)
ON CONFLICT (type_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS anf_places (
  place_id   text PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('branch', 'room')),
  name       text NOT NULL,
  branch_id  text,            -- rooms: which branch (NULL = any)
  sort_order int NOT NULL DEFAULT 0
);
INSERT INTO anf_places (place_id, kind, name, branch_id, sort_order) VALUES
  ('BACC', 'branch', 'BACC', NULL, 1),
  ('BTT', 'branch', 'BTT', NULL, 2),
  ('TRUE-ALPHA', 'branch', 'True Alpha', NULL, 3),
  ('CENTRALWORLD', 'branch', 'CentralWorld', NULL, 4),
  ('A60', 'room', 'A60', 'BACC', 10), ('A61', 'room', 'A61', 'BACC', 11), ('A63', 'room', 'A63', 'BACC', 12),
  ('A64', 'room', 'A64', 'BACC', 13), ('A65', 'room', 'A65', 'BACC', 14), ('A66', 'room', 'A66', 'BACC', 15),
  ('A80', 'room', 'A80', 'BACC', 16), ('MUSIC', 'room', 'Music room', 'BACC', 17),
  ('BAG', 'room', 'What''s in my Bag', 'BACC', 18), ('LONGTABLE', 'room', 'Long Table', 'BACC', 19),
  ('K001', 'room', 'K001', NULL, 30), ('K02', 'room', 'K02', NULL, 31), ('K04', 'room', 'K04', NULL, 32),
  ('K05', 'room', 'K05', NULL, 33), ('K11', 'room', 'K11', NULL, 34), ('K014', 'room', 'K014', NULL, 35)
ON CONFLICT (place_id) DO NOTHING;

-- 4. Tasks. column_id: new | progress | waiting | solved.
CREATE TABLE IF NOT EXISTS anf_tasks (
  task_id        text PRIMARY KEY,
  board_id       text NOT NULL DEFAULT 'anf' REFERENCES boards(board_id),
  column_id      text NOT NULL DEFAULT 'new' CHECK (column_id IN ('new', 'progress', 'waiting', 'solved')),
  position       int  NOT NULL DEFAULT 0,
  title          text NOT NULL,                 -- built: YYMMDD-[BRANCH-ROOM] - name
  name           text NOT NULL DEFAULT '',      -- the task itself
  type_id        text REFERENCES anf_task_types(type_id),
  issue_level    text CHECK (issue_level IS NULL OR issue_level IN ('critical', 'major', 'minor')),
  area           text,                          -- camera | printer | software | internet
  branch         text,
  room           text,
  start_date     date,
  due_date       date,
  description    text,
  assignee_ids   text[] NOT NULL DEFAULT '{}',
  checklists     jsonb  NOT NULL DEFAULT '[]',  -- [{id,name,items:[{id,text,done}]}]
  tags           text[] NOT NULL DEFAULT '{}',
  waiting_reason text,                          -- parts | customer | vendor | other
  waiting_note   text,
  taken_by       text, taken_at  timestamptz,   -- set on → In progress (รับเรื่อง)
  solved_by      text, solved_at timestamptz,   -- set on → Solved (เสร็จสิ้น)
  is_archived    boolean NOT NULL DEFAULT false,
  trello_id      text UNIQUE,                   -- one-off Trello import
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anf_tasks_col ON anf_tasks (board_id, is_archived, column_id, position);
CREATE INDEX IF NOT EXISTS idx_anf_tasks_due ON anf_tasks (due_date);

-- Members of the board (or admins) only.
ALTER TABLE anf_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE anf_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE anf_places     ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION is_board_member(b text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
      OR EXISTS (SELECT 1 FROM board_members m WHERE m.board_id = b AND m.user_id = auth.uid()::text)
$$;
DO $$ BEGIN
  CREATE POLICY "members read anf_tasks"  ON anf_tasks FOR SELECT USING (is_board_member(board_id));
  CREATE POLICY "members write anf_tasks" ON anf_tasks FOR ALL    USING (is_board_member(board_id)) WITH CHECK (is_board_member(board_id));
  CREATE POLICY "authenticated read anf_task_types"  ON anf_task_types FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write anf_task_types" ON anf_task_types FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  CREATE POLICY "authenticated read anf_places"  ON anf_places FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "authenticated write anf_places" ON anf_places FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. @mentions on tasks.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IN ('customer', 'lead_opportunity', 'won_job', 'anf_order', 'anf_task'));
