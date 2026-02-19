
CREATE OR REPLACE FUNCTION public.notify_on_activity_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
  student_name TEXT;
  instructor_id UUID;
  activity_name TEXT;
BEGIN
  -- Get course title and instructor
  SELECT c.title, c.instructor_id INTO course_title, instructor_id
  FROM public.courses c WHERE c.id = NEW.course_id;

  -- Get student name
  SELECT p.full_name INTO student_name
  FROM public.profiles p WHERE p.id = NEW.student_id;

  -- Get activity name
  SELECT af.file_name INTO activity_name
  FROM public.activity_files af WHERE af.id = NEW.activity_file_id;

  -- Notify the instructor
  INSERT INTO public.notifications (user_id, title, message, type, course_id, activity_file_id)
  VALUES (
    instructor_id,
    'New Submission: ' || COALESCE(activity_name, NEW.file_name),
    COALESCE(student_name, 'A student') || ' submitted a response for "' || COALESCE(activity_name, NEW.file_name) || '" in ' || COALESCE(course_title, 'your course') || '.',
    'activity',
    NEW.course_id,
    NEW.activity_file_id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_on_activity_submission
AFTER INSERT ON public.activity_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_activity_submission();
