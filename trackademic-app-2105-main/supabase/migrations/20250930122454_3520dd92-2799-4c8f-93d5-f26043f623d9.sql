-- Allow authenticated users to view all courses (needed for enrollment)
CREATE POLICY "Anyone can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (true);