-- Create activity_submissions table
CREATE TABLE public.activity_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_file_id UUID NOT NULL REFERENCES public.activity_files(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;

-- Students can insert their own submissions
CREATE POLICY "Students can submit their own activities"
ON public.activity_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
ON public.activity_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Instructors can view submissions for their courses
CREATE POLICY "Instructors can view submissions for their courses"
ON public.activity_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = activity_submissions.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Instructors can delete submissions for their courses
CREATE POLICY "Instructors can delete submissions for their courses"
ON public.activity_submissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = activity_submissions.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- Create storage bucket for submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-submissions', 'activity-submissions', false);

-- Students can upload their own submissions
CREATE POLICY "Students can upload their own submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'activity-submissions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-submissions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Instructors can view all submissions in their course folders
CREATE POLICY "Instructors can view course submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-submissions' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND courses.instructor_id = auth.uid()
  )
);

-- Instructors can delete submissions from their courses
CREATE POLICY "Instructors can delete course submissions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'activity-submissions' AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id::text = (storage.foldername(name))[1]
    AND courses.instructor_id = auth.uid()
  )
);