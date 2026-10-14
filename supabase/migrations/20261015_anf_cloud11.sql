-- Andy & Fine. — add the Cloud11 branch. Safe to run more than once.
INSERT INTO anf_places (place_id, kind, name, branch_id, sort_order)
VALUES ('CLOUD11', 'branch', 'Cloud11', NULL, 5)
ON CONFLICT (place_id) DO NOTHING;

-- Imported Trello tasks that mention Cloud11 / C11 but have no branch yet.
UPDATE anf_tasks SET branch = 'Cloud11', updated_at = now()
WHERE branch IS NULL AND (name ~* 'cloud\s*11|\mC11\M' OR description ~* 'cloud\s*11');
