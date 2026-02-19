-- Fix infinite recursion in courses policies
-- The issue is that courses policies reference enrollments which may reference courses

-- Drop all SELECT policies on courses
DROP POLICY IF EXISTS "Instructors can select their courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view enrolled courses" ON public.courses;
DROP POLICY IF EXISTS "Parents can view student courses" ON public.courses;

-- Create a single combined policy that avoids recursion
-- For students and parents, we use a direct subquery without nested joins
CREATE POLICY "Users can select courses" ON public.courses
FOR SELECT TO authenticated
USING (
  -- Instructors can view their own courses
  auth.uid() = instructor_id
  OR
  -- Students can view courses they're enrolled in (direct query to enrollments)
  id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid())
  OR
  -- Parents can view courses their linked students are enrolled in
  id IN (
    SELECT e.course_id 
    FROM public.enrollments e
    INNER JOIN public.parent_students ps ON ps.student_id = e.student_id
    WHERE ps.parent_id = auth.uid()
  )
);