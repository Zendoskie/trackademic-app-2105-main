-- Add deadline column to activity_files table
ALTER TABLE public.activity_files 
ADD COLUMN deadline timestamp with time zone DEFAULT NULL;