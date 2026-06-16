-- Enable Supabase Realtime on the activities table (required for RealtimeSync)
-- Run in Supabase Dashboard → SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
