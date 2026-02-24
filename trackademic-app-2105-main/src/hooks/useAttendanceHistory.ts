import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  status: 'present' | 'absent';
  marked_at: string;
  time_in: string | null;
  time_out: string | null;
  profiles: {
    full_name: string | null;
  } | null;
}

export const useAttendanceHistory = (courseId: string, studentId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchAttendanceHistory = async () => {
    let query = supabase
      .from('attendance')
      .select(`
        id,
        student_id,
        status,
        marked_at,
        time_in,
        time_out,
        profiles (
          full_name
        )
      `)
      .eq('course_id', courseId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query.order('marked_at', { ascending: false });

    if (error) {
      console.error("Error fetching attendance history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance history.",
        variant: "destructive",
      });
      throw new Error("Failed to fetch attendance history");
    }

    return (data as AttendanceRecord[]) || [];
  };

  const { data: attendanceRecords = [], isLoading, isError } = useQuery<AttendanceRecord[]>(
    ['attendance', courseId, studentId],
    fetchAttendanceHistory
  );

  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries(['attendance', courseId, studentId]);
  }, [queryClient, courseId, studentId]);

  return { attendanceRecords, isLoading, isError, invalidateQuery };
};
