-- =============================================
-- MASTER UPDATE: Specialized Forums & Mentorship
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Extend Enums safely
DO $$
BEGIN
    -- Add 'alumni' role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'alumni') THEN
        ALTER TYPE user_role ADD VALUE 'alumni';
    END IF;
END$$;

-- 2. Add Department Fields
DO $$
BEGIN
    -- For users/profiles (Used for Restricted Forum Access)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='department') THEN
        ALTER TABLE public.profiles ADD COLUMN department TEXT;
    END IF;
    -- For events/communities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communities' AND column_name='department') THEN
        ALTER TABLE public.communities ADD COLUMN department TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='department') THEN
        ALTER TABLE public.events ADD COLUMN department TEXT;
    END IF;
END$$;

-- 3. Create Feature Tables
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

CREATE TABLE IF NOT EXISTS public.forum_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color_theme TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_departments ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES

-- LOST & FOUND
DROP POLICY IF EXISTS "Public view lost_found" ON public.lost_found;
CREATE POLICY "Public view lost_found" ON public.lost_found FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can report items" ON public.lost_found;
CREATE POLICY "Users can report items" ON public.lost_found FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admin/Owner delete items" ON public.lost_found;
CREATE POLICY "Admin/Owner delete items" ON public.lost_found FOR DELETE USING (
    auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Owner can update items" ON public.lost_found;
CREATE POLICY "Owner can update items" ON public.lost_found FOR UPDATE USING (
    auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MENTORSHIP
DROP POLICY IF EXISTS "Public view mentors" ON public.mentorship_profiles;
CREATE POLICY "Public view mentors" ON public.mentorship_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin/Mentor manage" ON public.mentorship_profiles;
CREATE POLICY "Admin/Mentor manage" ON public.mentorship_profiles FOR ALL USING (
    auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- FORUM DEPARTMENTS
DROP POLICY IF EXISTS "Anyone view departments" ON public.forum_departments;
CREATE POLICY "Anyone view departments" ON public.forum_departments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage departments" ON public.forum_departments;
CREATE POLICY "Admins manage departments" ON public.forum_departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- COMMUNITIES & EVENTS (Admin Control)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can delete everything" ON public.communities;
    CREATE POLICY "Admins can delete everything" ON public.communities FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
    DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;
    CREATE POLICY "Admins can delete any event" ON public.events FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
END$$;

-- MESSAGES (Private DMs & Global)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their DMs and global chat" ON public.messages;
CREATE POLICY "Users can view their DMs and global chat" ON public.messages 
FOR SELECT USING (
    room_id = 'global' OR 
    room_id LIKE 'dm-%' AND (
        sender_id = auth.uid() OR 
        room_id LIKE '%-' || auth.uid() || '-%' OR
        room_id LIKE '%-' || auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages 
FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

-- 6. Realtime setup
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_found; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_departments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.communities; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 7. Marketplace Cleanup (Remove if exists)
DROP TABLE IF EXISTS public.marketplace;

-- 8. Admin Privilege Assignment
-- Ensure the specified admin email gets the admin role upon profile creation
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'prasanthanandarajan@gmail.com'
);
