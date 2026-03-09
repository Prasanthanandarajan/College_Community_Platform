-- ============================================================
-- Create the group_messages table for Global Group Chat
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone can read messages
DROP POLICY IF EXISTS "Anyone can view group messages" ON public.group_messages;
CREATE POLICY "Anyone can view group messages"
  ON public.group_messages FOR SELECT
  USING (true);

-- Authenticated users can send messages
DROP POLICY IF EXISTS "Authenticated users can send group messages" ON public.group_messages;
CREATE POLICY "Authenticated users can send group messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own group messages" ON public.group_messages;
CREATE POLICY "Users can delete own group messages"
  ON public.group_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any message
DROP POLICY IF EXISTS "Admins can delete any group message" ON public.group_messages;
CREATE POLICY "Admins can delete any group message"
  ON public.group_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
