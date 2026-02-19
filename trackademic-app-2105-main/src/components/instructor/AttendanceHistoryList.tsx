import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
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

interface AttendanceHistoryListProps {
  courseId: string;
  studentId?: string;
  studentName?: string;
}

const AttendanceHistoryList = ({ courseId, studentId, studentName }: AttendanceHistoryListProps) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAttendanceHistory = async () => {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          status,
          marked_at,
          time_in,
          time_out,
          profiles!attendance_student_id_fkey (
            full_name
          )
        `)
        .eq('course_id', courseId);
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.order('marked_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch attendance history.",
          variant: "destructive",
        });
        return;
      }

      setAttendanceRecords((data as AttendanceRecord[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
  }, [courseId, studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (attendanceRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          {studentName ? `No attendance history for ${studentName} yet.` : 'No attendance history yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attendanceRecords.map((record) => (
        <div
          key={record.id}
          className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              {record.status === 'present' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {record.profiles?.full_name || 'Unknown Student'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(record.marked_at).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              {(record.time_in || record.time_out) && (
                <p className="text-xs text-muted-foreground">
                  {record.time_in && (
                    <span>
                      Time In: {new Date(record.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {record.time_in && record.time_out && ' | '}
                  {record.time_out && (
                    <span>
                      Time Out: {new Date(record.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant={record.status === 'present' ? 'default' : 'destructive'}
            className="flex-shrink-0"
          >
            {record.status === 'present' ? 'Present' : 'Absent'}
          </Badge>
        </div>
      ))}
    </div>
  );
};

export default AttendanceHistoryList;
