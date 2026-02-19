
CREATE OR REPLACE FUNCTION public.notify_on_submission_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
  activity_name TEXT;
  notif_message TEXT;
  parent_record RECORD;
BEGIN
  -- Only fire when awarded_points changes from NULL to a value
  IF OLD.awarded_points IS NOT NULL OR NEW.awarded_points IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get course title
  SELECT c.title INTO course_title FROM public.courses c WHERE c.id = NEW.course_id;

  -- Get activity name
  SELECT af.file_name INTO activity_name FROM public.activity_files af WHERE af.id = NEW.activity_file_id;

  notif_message := 'Your submission for "' || COALESCE(activity_name, NEW.file_name) || '" in ' || COALESCE(course_title, 'your course') || ' has been graded. You received ' || NEW.awarded_points || ' points.';

  -- Notify the student
  INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
  VALUES (NEW.student_id, 'Submission Graded: ' || COALESCE(activity_name, NEW.file_name), notif_message, 'activity', NEW.course_id, NEW.activity_file_id);

  -- Notify linked parents
  FOR parent_record IN
    SELECT ps.parent_id FROM public.parent_students ps WHERE ps.student_id = NEW.student_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
    VALUES (parent_record.parent_id, 'Submission Graded: ' || COALESCE(activity_name, NEW.file_name), notif_message, 'activity', NEW.course_id, NEW.activity_file_id);
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_on_submission_graded
AFTER UPDATE ON public.activity_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_submission_graded();
