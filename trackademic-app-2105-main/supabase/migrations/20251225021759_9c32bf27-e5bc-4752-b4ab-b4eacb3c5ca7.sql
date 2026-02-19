-- Drop the old function and create a new one that searches by full_name
DROP FUNCTION IF EXISTS public.get_student_by_username(text);

CREATE OR REPLACE FUNCTION public.get_student_by_name(p_name text)
 RETURNS TABLE(id uuid, full_name text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.role
  FROM public.profiles p
  WHERE LOWER(p.full_name) = LOWER(p_name) AND p.role = 'student';
$function$;