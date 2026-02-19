-- Add RLS policy to allow students to insert their own attendance
CREATE POLICY "Students can insert their own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (auth.uid() = student_id);