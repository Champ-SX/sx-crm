-- Assign-to: multi-member assignees on Lead cards.
-- won_jobs already has assignee_ids (from 20260714_won_due_date.sql); this brings
-- lead_opportunities to parity so leads can be assigned and filtered by member.
-- Assignees are users.id[]. Safe to run more than once.
ALTER TABLE lead_opportunities
  ADD COLUMN IF NOT EXISTS assignee_ids text[] NOT NULL DEFAULT '{}';
