-- Ensure parent notifications are sent when activities/lectures are uploaded.
-- Recreate the trigger function with per-row exception handling so one failed insert
-- (e.g. missing profile) does not prevent other parents from receiving notifications.

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
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
      VALUES (student_record.student_id, notif_title, notif_message, notif_type, NEW.course_id, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip this row, continue with others
    END;
  END LOOP;

  -- Notify all parents of enrolled students (ensures parent dashboard receives notifications)
  FOR parent_record IN
    SELECT DISTINCT ps.parent_id
    FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE e.course_id = NEW.course_id
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
      VALUES (parent_record.parent_id, notif_title, notif_message, notif_type, NEW.course_id, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip this parent, continue with others
    END;
  END LOOP;

  RETURN NEW;
END;
$$;
