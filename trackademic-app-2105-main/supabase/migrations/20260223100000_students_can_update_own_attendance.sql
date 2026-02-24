-- Allow students to update their own attendance (e.g. set time_out when scanning QR second time)
CREATE POLICY "Students can update their own attendance"
ON public.attendance
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
