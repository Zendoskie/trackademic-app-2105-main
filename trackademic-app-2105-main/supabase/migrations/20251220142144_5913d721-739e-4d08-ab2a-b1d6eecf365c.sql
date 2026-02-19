-- Drop the incorrect policies
DROP POLICY IF EXISTS "Instructors can view course submissions" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course submissions" ON storage.objects;

-- Create fixed policies that match the actual file path structure: student_id/course_id/filename
CREATE POLICY "Instructors can view course submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-submissions'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id::text = (storage.foldername(name))[2]
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can delete course submissions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'activity-submissions'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id::text = (storage.foldername(name))[2]
    AND courses.instructor_id = auth.uid()
  )
);