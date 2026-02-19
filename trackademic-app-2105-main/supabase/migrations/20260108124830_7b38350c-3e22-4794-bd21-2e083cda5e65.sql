-- Add time tracking and session reference columns to attendance table
ALTER TABLE public.attendance 
ADD COLUMN time_in timestamp with time zone,
ADD COLUMN time_out timestamp with time zone,
ADD COLUMN session_id uuid REFERENCES public.sessions(id);