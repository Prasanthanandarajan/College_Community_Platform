-- =============================================
-- New Features SQL: Lost & Found, Forums, Mentorship
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add 'alumni' to user_role enum safely
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'alumni';
EXCEPTION
    WHEN duplicate_object THEN null;
END$$;

-- 2. Create Lost_Found table
CREATE TABLE IF NOT EXISTS public.lost_found (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL, -- 'lost' or 'found'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    date_reported TIMESTAMPTZ DEFAULT NOW(),
    contact_info TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Mentorship_Profiles table (extends public.profiles)
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    expertise TEXT NOT NULL,
    company TEXT,
    role_title TEXT,
    linkedin_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Lost & Found
DROP POLICY IF EXISTS "Anyone can view lost_found" ON public.lost_found;
CREATE POLICY "Anyone can view lost_found" ON public.lost_found FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can report lost_found items" ON public.lost_found;
CREATE POLICY "Users can report lost_found items" ON public.lost_found FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reporters can update their items" ON public.lost_found;
CREATE POLICY "Reporters can update their items" ON public.lost_found FOR UPDATE USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reporters can delete their items" ON public.lost_found;
CREATE POLICY "Reporters can delete their items" ON public.lost_found FOR DELETE USING (auth.uid() = reporter_id);

-- 6. RLS Policies for Mentorship
DROP POLICY IF EXISTS "Anyone can view mentors" ON public.mentorship_profiles;
CREATE POLICY "Anyone can view mentors" ON public.mentorship_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Alumni can create mentorship profiles" ON public.mentorship_profiles;
CREATE POLICY "Alumni can create mentorship profiles" ON public.mentorship_profiles 
FOR INSERT WITH CHECK (
    auth.uid() = id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'alumni'::user_role)
);

DROP POLICY IF EXISTS "Mentors can update own profile" ON public.mentorship_profiles;
CREATE POLICY "Mentors can update own profile" ON public.mentorship_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Mentors can delete own profile" ON public.mentorship_profiles;
CREATE POLICY "Mentors can delete own profile" ON public.mentorship_profiles FOR DELETE USING (auth.uid() = id);

-- 7. Add Forums support to existing Messages/Rooms
-- We don't necessarily need a new table for forum messages if we reuse the messages table.
-- The existing messages table has `room_id`. We can use things like `forum-cs`, `forum-mech` for `room_id`.
-- However, we must ensure users can send messages to these rooms. The existing policy "Users can send messages" applies to all rooms.

-- 8. Realtime updates
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_found; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
