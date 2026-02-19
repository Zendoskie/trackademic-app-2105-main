-- Fix infinite recursion between courses <-> enrollments RLS by moving enrollment checks into SECURITY DEFINER functions

-- 1) SECURITY DEFINER helper: user can view a course if they are enrolled as student
create or replace function public.is_student_enrolled_in_course(_user_id uuid, _course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = _user_id
      and e.course_id = _course_id
  );
$$;

-- 2) SECURITY DEFINER helper: user can view a course if they are a parent of an enrolled student
create or replace function public.is_parent_linked_to_course(_parent_id uuid, _course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_students ps
    join public.enrollments e on e.student_id = ps.student_id
    where ps.parent_id = _parent_id
      and e.course_id = _course_id
  );
$$;

-- 3) Replace courses SELECT policy to avoid querying enrollments directly in RLS
DO $$
BEGIN
  -- Drop prior policies if they exist
  IF EXISTS (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'Users can select courses'
  ) THEN
    execute 'drop policy "Users can select courses" on public.courses';
  END IF;

  IF EXISTS (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'Instructors can select their courses'
  ) THEN
    execute 'drop policy "Instructors can select their courses" on public.courses';
  END IF;

  IF EXISTS (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'Students can view enrolled courses'
  ) THEN
    execute 'drop policy "Students can view enrolled courses" on public.courses';
  END IF;

  IF EXISTS (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'Parents can view student courses'
  ) THEN
    execute 'drop policy "Parents can view student courses" on public.courses';
  END IF;
END $$;

create policy "Users can select courses"
on public.courses
for select
to authenticated
using (
  auth.uid() = instructor_id
  or public.is_student_enrolled_in_course(auth.uid(), id)
  or public.is_parent_linked_to_course(auth.uid(), id)
);
