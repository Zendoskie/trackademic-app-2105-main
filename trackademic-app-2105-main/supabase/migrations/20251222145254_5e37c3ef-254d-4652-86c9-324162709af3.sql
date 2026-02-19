-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Create parent_students relationship table
CREATE TABLE public.parent_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS on parent_students
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Parents can view their linked students
CREATE POLICY "Parents can view their linked students"
ON public.parent_students
FOR SELECT
USING (auth.uid() = parent_id);

-- Parents can insert links for themselves
CREATE POLICY "Parents can insert links for themselves"
ON public.parent_students
FOR INSERT
WITH CHECK (auth.uid() = parent_id);

-- Students can view who linked to them
CREATE POLICY "Students can view their parent links"
ON public.parent_students
FOR SELECT
USING (auth.uid() = student_id);

-- Create function to get profile by username (for parent signup validation)
CREATE OR REPLACE FUNCTION public.get_student_by_username(p_username TEXT)
RETURNS TABLE(id UUID, full_name TEXT, role TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.role
  FROM public.profiles p
  WHERE p.username = p_username AND p.role = 'student';
$$;