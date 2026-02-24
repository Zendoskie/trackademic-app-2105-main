import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAttendanceHistory, AttendanceRecord } from "@/hooks/useAttendanceHistory";

interface AttendanceCardProps {
  courseId: string;
  studentId?: string;
  studentName?: string;
}

const AttendanceCard = ({ courseId, studentId, studentName }: AttendanceCardProps) => {
  const { attendanceRecords, isLoading, isError } = useAttendanceHistory(courseId, studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">
          Error loading attendance history. Please try again later.
        </p>
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
                {record.profiles?.full_name || record.student_id}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(record.marked_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                <span>
                  Time In: {record.time_in ? new Date(record.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
                </span>
                <span className="hidden sm:inline">|</span>
                <span>
                  Time Out: {record.time_out ? new Date(record.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
                </span>
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

export default AttendanceCard;
