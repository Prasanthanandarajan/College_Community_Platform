-- Admin Policies: Allow admins to manage everything

-- Posts: Admins can update and delete any post
DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post" ON public.posts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post" ON public.posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Communities: Admins can delete any community
DROP POLICY IF EXISTS "Admins can delete any community" ON public.communities;
CREATE POLICY "Admins can delete any community" ON public.communities FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles: Admins can update any profile (for role changes)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Moderation Logs: Admins can update log status
DROP POLICY IF EXISTS "Admins can update moderation logs" ON public.moderation_logs;
CREATE POLICY "Admins can update moderation logs" ON public.moderation_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
