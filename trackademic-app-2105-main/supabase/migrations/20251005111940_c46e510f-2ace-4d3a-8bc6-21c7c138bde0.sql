-- Add foreign key constraint from attendance.student_id to profiles.id
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;