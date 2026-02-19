-- Allow parents to view profiles of students linked to them
CREATE POLICY "Parents can view linked student profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND ps.student_id = profiles.id
  )
);

-- Allow parents to view enrollments of students linked to them
CREATE POLICY "Parents can view linked student enrollments"
ON public.enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND ps.student_id = enrollments.student_id
  )
);
