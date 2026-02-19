-- Fix duplicate SELECT policies on courses table
-- Drop the overly permissive "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

-- Create a proper policy that allows both instructors and students to view courses
CREATE POLICY "Users can view courses" ON public.courses
FOR SELECT
USING (
  -- Instructors can view their own courses
  auth.uid() = instructor_id
  OR
  -- Students can view courses they're enrolled in
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id AND e.student_id = auth.uid()
  )
  OR
  -- Parents can view linked student courses (existing logic)
  EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND e.course_id = courses.id
  )
);

-- Drop the old instructor-only view policy since it's now combined
DROP POLICY IF EXISTS "Instructors can view their own courses" ON public.courses;

-- Drop the old parent policy since it's now combined
DROP POLICY IF EXISTS "Parents can view linked student courses" ON public.courses;