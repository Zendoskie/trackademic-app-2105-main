-- Create storage bucket for course activity files
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-activities', 'course-activities', false);

-- Create table for activity files metadata
CREATE TABLE public.activity_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS on activity_files table
ALTER TABLE public.activity_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_files table
CREATE POLICY "Instructors can upload files for their courses"
ON public.activity_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = activity_files.course_id
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can view files for their courses"
ON public.activity_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = activity_files.course_id
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can delete files for their courses"
ON public.activity_files
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = activity_files.course_id
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view files for enrolled courses"
ON public.activity_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.course_id = activity_files.course_id
    AND enrollments.student_id = auth.uid()
  )
);

-- Storage policies for course-activities bucket
CREATE POLICY "Instructors can upload files for their courses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-activities' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = (storage.foldername(name))[1]::uuid
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can view files for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-activities' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = (storage.foldername(name))[1]::uuid
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can delete files for their courses"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-activities' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = (storage.foldername(name))[1]::uuid
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view files for enrolled courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-activities' AND
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.course_id = (storage.foldername(name))[1]::uuid
    AND enrollments.student_id = auth.uid()
  )
);