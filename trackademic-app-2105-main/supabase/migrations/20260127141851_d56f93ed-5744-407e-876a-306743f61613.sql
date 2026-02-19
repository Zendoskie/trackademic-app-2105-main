-- First, delete orphaned activity_files where uploaded_by references deleted users
DELETE FROM public.activity_files 
WHERE uploaded_by NOT IN (SELECT id FROM auth.users);

-- Delete orphaned lectures where uploaded_by references deleted users
DELETE FROM public.lectures 
WHERE uploaded_by NOT IN (SELECT id FROM auth.users);

-- Drop the existing foreign key constraint on lectures.uploaded_by
ALTER TABLE public.lectures 
DROP CONSTRAINT IF EXISTS lectures_uploaded_by_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE public.lectures
ADD CONSTRAINT lectures_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the existing foreign key constraint on activity_files.uploaded_by  
ALTER TABLE public.activity_files 
DROP CONSTRAINT IF EXISTS activity_files_uploaded_by_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE public.activity_files
ADD CONSTRAINT activity_files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;