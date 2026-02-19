
CREATE OR REPLACE FUNCTION public.notify_on_student_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title TEXT;
  instructor_id UUID;
  student_name TEXT;
BEGIN
  -- Get course title and instructor
  SELECT c.title, c.instructor_id INTO course_title, instructor_id
  FROM public.courses c WHERE c.id = NEW.course_id;

  -- Get student name
  SELECT p.full_name INTO student_name
  FROM public.profiles p WHERE p.id = NEW.student_id;

  -- Notify the instructor
  INSERT INTO public.notifications (user_id, title, message, type, course_id)
  VALUES (
    instructor_id,
    'New Student Enrolled',
    COALESCE(student_name, 'A student') || ' has enrolled in ' || COALESCE(course_title, 'your course') || '.',
    'info',
    NEW.course_id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_on_student_enrollment
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_student_enrollment();
