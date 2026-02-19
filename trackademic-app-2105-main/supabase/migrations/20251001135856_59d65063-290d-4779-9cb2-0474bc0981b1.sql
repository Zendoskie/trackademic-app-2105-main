-- Add email and role columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS role text;

-- Update existing profiles with email and role from auth.users
UPDATE public.profiles p
SET 
  email = u.email,
  role = COALESCE(
    u.raw_user_meta_data->>'role',
    'student'
  )
FROM auth.users u
WHERE u.id = p.id;

-- Update the handle_new_user function to include email and role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name'
    ),
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'role',
      'student'
    )
  );
  RETURN new;
END;
$$;