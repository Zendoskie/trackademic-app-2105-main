-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Instructors can view attendance for their courses
CREATE POLICY "Instructors can view attendance for their courses"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = attendance.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Instructors can insert attendance for their courses
CREATE POLICY "Instructors can insert attendance for their courses"
ON public.attendance
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = attendance.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance"
ON public.attendance
FOR SELECT
USING (auth.uid() = student_id);

-- Create index for better performance
CREATE INDEX idx_attendance_course_id ON public.attendance(course_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);