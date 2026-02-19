-- Add awarded_points column to activity_submissions table
ALTER TABLE public.activity_submissions
ADD COLUMN awarded_points integer DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.activity_submissions.awarded_points IS 'Points awarded by instructor for this submission';

-- Allow instructors to update submissions for their courses (to grade them)
CREATE POLICY "Instructors can update submissions for their courses"
ON public.activity_submissions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = activity_submissions.course_id
  AND courses.instructor_id = auth.uid()
));