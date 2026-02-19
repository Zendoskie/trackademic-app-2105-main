-- First, create profiles for any existing enrollments without profiles
INSERT INTO public.profiles (id, full_name)
SELECT DISTINCT e.student_id, 'Student User'
FROM public.enrollments e
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = e.student_id
);

-- Now add the foreign key relationship
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;