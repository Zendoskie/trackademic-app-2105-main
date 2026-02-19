-- Create sessions table to track class sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

-- Create session_participants table to track who joined the session
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  marked_present BOOLEAN NOT NULL DEFAULT false,
  marked_present_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Instructors can create sessions for their courses"
ON public.sessions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM courses WHERE courses.id = sessions.course_id AND courses.instructor_id = auth.uid()
));

CREATE POLICY "Instructors can view sessions for their courses"
ON public.sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses WHERE courses.id = sessions.course_id AND courses.instructor_id = auth.uid()
));

CREATE POLICY "Instructors can update sessions for their courses"
ON public.sessions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM courses WHERE courses.id = sessions.course_id AND courses.instructor_id = auth.uid()
));

CREATE POLICY "Students can view sessions for enrolled courses"
ON public.sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM enrollments WHERE enrollments.course_id = sessions.course_id AND enrollments.student_id = auth.uid()
));

-- Session participants policies
CREATE POLICY "Instructors can view participants for their course sessions"
ON public.session_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN courses c ON c.id = s.course_id
  WHERE s.id = session_participants.session_id AND c.instructor_id = auth.uid()
));

CREATE POLICY "Instructors can update participants for their course sessions"
ON public.session_participants FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN courses c ON c.id = s.course_id
  WHERE s.id = session_participants.session_id AND c.instructor_id = auth.uid()
));

CREATE POLICY "Students can join sessions for enrolled courses"
ON public.session_participants FOR INSERT
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM sessions s
    JOIN enrollments e ON e.course_id = s.course_id
    WHERE s.id = session_participants.session_id AND e.student_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own participation"
ON public.session_participants FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own participation"
ON public.session_participants FOR SELECT
USING (auth.uid() = student_id);