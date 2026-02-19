-- Ensure profiles reflect Auth display names and keep them in sync going forward
-- 1) Create/refresh trigger so new users auto-populate profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2) Backfill missing profiles from existing auth.users
INSERT INTO public.profiles (id, full_name)
SELECT u.id,
       COALESCE(
         u.raw_user_meta_data->>'full_name',
         u.raw_user_meta_data->>'display_name',
         u.raw_user_meta_data->>'name'
       )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3) Update placeholder or empty names with actual display names from Auth
UPDATE public.profiles p
SET full_name = COALESCE(
                  u.raw_user_meta_data->>'full_name',
                  u.raw_user_meta_data->>'display_name',
                  u.raw_user_meta_data->>'name'
                )
FROM auth.users u
WHERE u.id = p.id
  AND COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'name'
      ) IS NOT NULL
  AND TRIM(COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'name'
      )) <> ''
  AND (p.full_name IS NULL OR p.full_name = 'Student User');