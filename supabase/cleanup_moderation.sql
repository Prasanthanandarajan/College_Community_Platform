-- 1. Fix moderation_logs schema to allow NULL content_id (fixes logging for new posts)
ALTER TABLE public.moderation_logs ALTER COLUMN content_id DROP NOT NULL;

-- 2. Clean up the unwanted posts you see in the screenshot
DELETE FROM public.posts WHERE content ILIKE '%abuse%' OR content ILIKE '%sexual%';

-- 3. (Optional) Set yourself as admin if you haven't yet
-- UPDATE public.profiles SET role = 'admin' WHERE full_name = 'prasanth';
