-- Add category column to activity_files table to distinguish lectures from activities
ALTER TABLE public.activity_files 
ADD COLUMN category text NOT NULL DEFAULT 'activity';

-- Add a comment for clarity
COMMENT ON COLUMN public.activity_files.category IS 'Type of file: lecture or activity';