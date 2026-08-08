-- @mention / owner roster fix — pre-provision team members + email-keyed login.
-- A UNIQUE email lets a teammate be added to the roster before they log in, and
-- lets auth-provider link their Google account to that row by email (no dupes).
--
-- If this fails on a duplicate, dedupe first:
--   select email, count(*) from users group by email having count(*) > 1;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
