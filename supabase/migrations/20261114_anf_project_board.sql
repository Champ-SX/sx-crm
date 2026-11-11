-- Andy & Fine. board → Photohouse projects.
-- Columns: idea | planned | progress | review | done (was new | progress | waiting | solved).
-- Existing cards are moved, nothing is deleted:
--   new → idea · waiting → progress + status "blocked" (waiting reason kept as the note) · solved → done.
-- Adds: status update (health) and Google Drive graphic links. Safe to re-run.

alter table anf_tasks drop constraint if exists anf_tasks_column_id_check;

alter table anf_tasks
  add column if not exists health      text check (health in ('on_track','at_risk','blocked')),
  add column if not exists health_note text,
  add column if not exists health_by   text,
  add column if not exists health_at   timestamptz,
  add column if not exists graphics    jsonb not null default '[]'::jsonb;

update anf_tasks set
  health      = 'blocked',
  health_note = coalesce(nullif(concat_ws(' · ',
                  case waiting_reason when 'parts' then 'Waiting for parts' when 'customer' then 'Waiting for customer'
                                      when 'vendor' then 'Waiting for vendor / ISP' when 'other' then 'Waiting' end,
                  waiting_note), ''), 'Waiting'),
  health_at   = coalesce(updated_at, now())
where column_id = 'waiting';

update anf_tasks set column_id = case column_id
  when 'new' then 'idea' when 'waiting' then 'progress' when 'solved' then 'done' else column_id end
where column_id in ('new','waiting','solved');

alter table anf_tasks alter column column_id set default 'idea';
alter table anf_tasks add constraint anf_tasks_column_id_check
  check (column_id in ('idea','planned','progress','review','done'));

-- Check: how many cards in each column now.
select column_id, count(*) from anf_tasks group by column_id order by 1;
