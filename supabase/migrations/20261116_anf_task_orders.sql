-- Purchases ↔ Andy & Fine. tasks: a request can point to a task (and one sub-task),
-- and a PO carries an ETA. Safe to re-run.
alter table anf_requests
  add column if not exists anf_task_id    text,
  add column if not exists anf_subtask_id text;
create index if not exists idx_anf_requests_task on anf_requests (anf_task_id) where anf_task_id is not null;

alter table anf_pos add column if not exists eta date;

select count(*) filter (where anf_task_id is not null) as linked_requests from anf_requests;
