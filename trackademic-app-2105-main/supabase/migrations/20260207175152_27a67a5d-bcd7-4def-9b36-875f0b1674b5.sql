-- Allow parents to view activity files in storage for linked student courses
CREATE POLICY "Parents can view activity files for linked student courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-activities'
  AND EXISTS (
    SELECT 1
    FROM parent_students ps
    JOIN enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid()
      AND e.course_id = ((storage.foldername(name))[1])::uuid
  )
);

-- Allow parents to view linked student submissions in storage
CREATE POLICY "Parents can view linked student submissions"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'activity-submissions'
  AND EXISTS (
    SELECT 1
    FROM parent_students ps
    WHERE ps.parent_id = auth.uid()
      AND (ps.student_id)::text = (storage.foldername(name))[1]
  )
);