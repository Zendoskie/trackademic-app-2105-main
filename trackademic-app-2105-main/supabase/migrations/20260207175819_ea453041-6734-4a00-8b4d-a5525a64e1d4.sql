
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'activity', 'lecture', 'info'
  is_read BOOLEAN NOT NULL DEFAULT false,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_file_id UUID REFERENCES public.activity_files(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow inserts from triggers (service role / database functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Function to create notifications when an activity file is uploaded
CREATE OR REPLACE FUNCTION public.notify_on_activity_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  course_title TEXT;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  student_record RECORD;
  parent_record RECORD;
BEGIN
  -- Get course title
  SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;

  IF NEW.category = 'activity' THEN
    notif_type := 'activity';
    notif_title := 'New Activity: ' || NEW.file_name;
    notif_message := 'A new activity has been posted in ' || course_title || '.';
    
    IF NEW.points IS NOT NULL THEN
      notif_message := notif_message || ' Points: ' || NEW.points || '.';
    END IF;
    
    IF NEW.deadline IS NOT NULL THEN
      notif_message := notif_message || ' Deadline: ' || to_char(NEW.deadline::timestamp with time zone, 'Mon DD, YYYY HH12:MI AM') || '.';
    END IF;
  ELSE
    notif_type := 'lecture';
    notif_title := 'New Lecture: ' || NEW.file_name;
    notif_message := 'A new lecture material has been posted in ' || course_title || '.';
  END IF;

  -- Notify all enrolled students
  FOR student_record IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
    VALUES (student_record.student_id, notif_title, notif_message, notif_type, NEW.course_id, NEW.id);
  END LOOP;

  -- Notify all parents of enrolled students
  FOR parent_record IN
    SELECT DISTINCT ps.parent_id
    FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
    VALUES (parent_record.parent_id, notif_title, notif_message, notif_type, NEW.course_id, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_activity_file_upload
AFTER INSERT ON public.activity_files
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_activity_file_upload();
