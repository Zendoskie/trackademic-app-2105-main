import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, CheckCircle2, XCircle } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AttendanceCard from "@/components/shared/AttendanceCard";
import { useAttendanceHistory } from "@/hooks/useAttendanceHistory";

interface Course {
  id: string;
  title: string;
}

interface StudentProfile {
  id: string;
  full_name: string | null;
}

export default function InstructorStudentAttendanceDashboard() {
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { attendanceRecords, isLoading: attendanceLoading } = useAttendanceHistory(courseId!, studentId!);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !studentId) return;

      try {
        const [courseResult, studentResult] = await Promise.all([
          supabase.from('courses').select('id, title').eq('id', courseId).single(),
          supabase.from('profiles').select('id, full_name').eq('id', studentId).single(),
        ]);

        if (courseResult.error) throw courseResult.error;
        if (studentResult.error) throw studentResult.error;

        setCourse(courseResult.data);
        setStudent(studentResult.data);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load page details.",
          variant: "destructive",
        });
        navigate(`/instructor-dashboard/course/${courseId}/attendance`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, studentId, navigate, toast]);

  const presentRecords = attendanceRecords.filter(record => record.status === 'present');
  const absentRecords = attendanceRecords.filter(record => record.status === 'absent');

  if (loading || attendanceLoading) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance details...</p>
        </div>
      </div>
    );
  }

  if (!course || !student) {
    return null;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}/attendance`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
          <div className="flex items-start gap-4">
            <User className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {student.full_name || 'Unknown Student'}
              </h1>
              <p className="text-muted-foreground">
                Attendance History for {course.title}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{attendanceRecords.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Present
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{presentRecords.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Absences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{absentRecords.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              Viewing all of {student.full_name}'s records for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceCard courseId={courseId!} studentId={studentId!} studentName={student.full_name!} />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
