-- Create a SECURITY DEFINER function that allows looking up a course by code
-- This bypasses RLS so students can find courses they want to enroll in

create or replace function public.get_course_by_code(_course_code text)
returns table (
  id uuid,
  title text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.title
  from public.courses c
  where c.course_code = _course_code
  limit 1;
$$;