-- Add points column to activity_files table
ALTER TABLE public.activity_files
ADD COLUMN points integer DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.activity_files.points IS 'Maximum points a student can earn for this activity';