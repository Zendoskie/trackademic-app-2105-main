-- The policies are RESTRICTIVE which means ALL must pass (AND logic)
-- They need to be PERMISSIVE (OR logic) so any matching policy grants access

-- Drop the newly created policy
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;

-- Recreate all courses SELECT policies as PERMISSIVE
CREATE POLICY "Instructors can select their courses" ON public.courses
FOR SELECT TO authenticated
USING (auth.uid() = instructor_id);

CREATE POLICY "Students can view enrolled courses" ON public.courses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id AND e.student_id = auth.uid()
  )
);

CREATE POLICY "Parents can view student courses" ON public.courses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND e.course_id = courses.id
  )
);