-- Fix 1: Add INSERT policy for profiles (so the trigger can create profiles)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix 2: Recreate handle_new_user with stronger SECURITY DEFINER + SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role_val user_role;
BEGIN
    CASE (NEW.raw_user_meta_data->>'role')
        WHEN 'student' THEN user_role_val := 'student';
        WHEN 'faculty' THEN user_role_val := 'faculty';
        WHEN 'admin' THEN user_role_val := 'admin';
        ELSE user_role_val := 'student';
    END CASE;

    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'avatar_url',
        user_role_val
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 3: Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Fix 4: Delete any "ghost" users from failed signup attempts
-- (They exist in auth.users but have no profile, causing issues)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
AND created_at > NOW() - INTERVAL '1 day';
