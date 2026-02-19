-- Make student name lookup resilient to casing and extra spaces
CREATE OR REPLACE FUNCTION public.get_student_by_name(p_name text)
RETURNS TABLE(id uuid, full_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.role
  FROM public.profiles p
  WHERE p.role = 'student'
    AND lower(trim(p.full_name)) = lower(trim(p_name));
$$;