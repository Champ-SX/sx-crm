-- SECURITY FIX: re-enable Row Level Security.
-- Advisor flagged "Policy Exists RLS Disabled" — these tables have policies but
-- RLS was turned off (manually, in the dashboard), leaving them inert. With RLS
-- off, anyone with the public anon key could read/write everything (incl. staff
-- bank details). Policies for authenticated users already exist, so enabling RLS
-- restores protection without breaking the login-gated app.
-- Idempotent: enabling on an already-enabled table is a no-op.

ALTER TABLE public.activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_persons    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.won_jobs           ENABLE ROW LEVEL SECURITY;

-- Enable on the rest too (no-op if already on) so nothing is left exposed.
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_op_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags               ENABLE ROW LEVEL SECURITY;
