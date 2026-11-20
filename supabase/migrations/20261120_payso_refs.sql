-- Payso postback inbox: order references only (no amounts are trusted from here).
-- The Mac daily script reads a day's refs from /api/sales/payso-orders and verifies each one
-- with the Payso Inquiry API before anything reaches sales_txns.
create table if not exists public.payso_refs (
  refno text primary key,
  received_at timestamptz not null default now(),
  total text,
  productdetail text,
  via text            -- 'post' (Control Panel default) or 'get' (dynamic postback)
);
create index if not exists payso_refs_received_idx on public.payso_refs (received_at);
alter table public.payso_refs enable row level security;   -- no policies: service role only
