-- Fix search path for generate_course_code function
CREATE OR REPLACE FUNCTION generate_course_code()
RETURNS TEXT 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 6-character alphanumeric code
        code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3) || 
            LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
        );
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.courses WHERE course_code = code) INTO exists_check;
        
        -- If code doesn't exist, return it
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;