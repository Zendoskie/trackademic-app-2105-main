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
      // Select attendance only first (avoids join/RLS issues with profiles)
      let query = supabase
        .from('attendance')
        .select('id, student_id, status, marked_at, time_in, time_out')
        .eq('course_id', courseId);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data: attendanceData, error } = await query.order('marked_at', { ascending: false });

      if (error) {
        console.error("Error fetching attendance history:", error);
        toast({
          title: "Error",
          description: "Failed to fetch attendance history.",
          variant: "destructive",
        });
        return;
      }

      const records = (attendanceData || []) as Omit<AttendanceRecord, 'profiles'>[];
      if (records.length === 0) {
        setAttendanceRecords([]);
        return;
      }

      // Fetch profile names for displayed students (single batch)
      const studentIds = [...new Set(records.map((r) => r.student_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, { full_name: p.full_name }])
      );

      const recordsWithProfiles: AttendanceRecord[] = records.map((r) => ({
        ...r,
        profiles: profileMap.get(r.student_id) || null,
      }));

      setAttendanceRecords(recordsWithProfiles);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Only show records that have both time in and time out (actual times, no placeholders)
  const recordsWithTimes = attendanceRecords.filter(
    (r) => r.time_in != null && r.time_out != null
  );

  if (recordsWithTimes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No attendance with both time in and time out yet. Students need to scan the QR twice (once to time in, once to time out).
        </p>
      </div>
    );
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      {recordsWithTimes.map((record) => (
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
                {record.profiles?.full_name || record.student_id}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(record.marked_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <div className="text-xs text-muted-foreground flex gap-2">
                <span>Time In: {formatTime(record.time_in!)}</span>
                <span>|</span>
                <span>Time Out: {formatTime(record.time_out!)}</span>
              </div>
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
