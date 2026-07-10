-- Store each user's Google profile picture, captured on login, so their avatar
-- can be shown wherever their name/owner appears (not just the current user).
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
