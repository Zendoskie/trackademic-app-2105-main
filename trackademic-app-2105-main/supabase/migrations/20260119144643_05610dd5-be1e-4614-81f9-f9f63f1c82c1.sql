-- Add INSERT policy for profiles table to prevent unauthorized profile creation
-- Profiles should only be created by the handle_new_user trigger, but as a safety measure,
-- we allow authenticated users to insert only their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);