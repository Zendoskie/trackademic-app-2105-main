-- Enable realtime for session_participants table
ALTER TABLE public.session_participants REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;