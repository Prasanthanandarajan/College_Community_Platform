-- Add department column to communities and events
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS department TEXT;

-- Update Realtime for these tables to ensure changes are picked up
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.communities; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN OTHERS THEN NULL; END $$;
