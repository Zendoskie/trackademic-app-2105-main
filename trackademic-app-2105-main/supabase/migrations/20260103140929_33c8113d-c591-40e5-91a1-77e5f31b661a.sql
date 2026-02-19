-- Allow parents to view attendance records of students linked to them
CREATE POLICY "Parents can view linked student attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND ps.student_id = attendance.student_id
  )
);

-- Allow parents to view activity submissions of students linked to them
CREATE POLICY "Parents can view linked student submissions"
ON public.activity_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND ps.student_id = activity_submissions.student_id
  )
);

-- Allow parents to view activity files for courses their linked students are enrolled in
CREATE POLICY "Parents can view activity files for linked student courses"
ON public.activity_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid()
      AND e.course_id = activity_files.course_id
  )
);

-- Allow parents to view courses their linked students are enrolled in
CREATE POLICY "Parents can view linked student courses"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid()
      AND e.course_id = courses.id
  )
);