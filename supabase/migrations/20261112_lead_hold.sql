-- Leads: "Hold" status (client is holding the date, very likely to win).
-- status is free text, so only the hold details are new.
alter table lead_opportunities
  add column if not exists hold_product text,   -- event product, e.g. What's in my Bag
  add column if not exists hold_prepare text,   -- what Ops would prepare, e.g. Passport 250 ชิ้น
  add column if not exists hold_until   date;   -- optional: confirm-or-release date
