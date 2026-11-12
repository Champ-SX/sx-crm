-- Andy & Fine. board: open to every signed-in team member (no members-only lock).
-- Safe to run more than once.
UPDATE boards SET restricted = false WHERE board_id = 'anf';

-- Task rows: any signed-in user (was: board members + admins).
DROP POLICY IF EXISTS "members read anf_tasks"  ON anf_tasks;
DROP POLICY IF EXISTS "members write anf_tasks" ON anf_tasks;
DROP POLICY IF EXISTS "authenticated read anf_tasks"  ON anf_tasks;
DROP POLICY IF EXISTS "authenticated write anf_tasks" ON anf_tasks;
CREATE POLICY "authenticated read anf_tasks"  ON anf_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated write anf_tasks" ON anf_tasks FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
