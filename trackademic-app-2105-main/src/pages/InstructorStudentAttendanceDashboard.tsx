import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardList, CheckCircle2, XCircle, User } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface Course {
  id: string;
  title: string;
}

interface StudentProfile {
  id: string;
  full_name: string | null;
}

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent';
  marked_at: string;
  time_in: string | null;
  time_out: string | null;
}

export default function InstructorStudentAttendanceDashboard() {
  const { courseId, studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !studentId) return;

      try {
        // Fetch course, student profile, and attendance records in parallel
        const [courseResult, studentResult, attendanceResult] = await Promise.all([
          supabase
            .from('courses')
            .select('id, title')
            .eq('id', courseId)
            .single(),
          supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', studentId)
            .single(),
          supabase
            .from('attendance')
            .select('id, status, marked_at, time_in, time_out')
            .eq('course_id', courseId)
            .eq('student_id', studentId)
            .order('marked_at', { ascending: false })
        ]);

        if (courseResult.error) {
          toast({
            title: "Error",
            description: "Failed to load course details",
            variant: "destructive",
          });
          navigate(`/instructor-dashboard/course/${courseId}/attendance`);
          return;
        }

        if (studentResult.error) {
          toast({
            title: "Error",
            description: "Failed to load student details",
            variant: "destructive",
          });
          navigate(`/instructor-dashboard/course/${courseId}/attendance`);
          return;
        }

        setCourse(courseResult.data);
        setStudent(studentResult.data);
        setAttendanceRecords((attendanceResult.data as AttendanceRecord[]) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
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

  if (loading) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAttendanceList = (records: AttendanceRecord[], type: 'present' | 'absent') => {
    if (records.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {type === 'present' 
              ? 'No present records found for this student.' 
              : 'No absences recorded for this student.'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                {type === 'present' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {formatDate(record.marked_at)}
                </p>
                {type === 'present' && (record.time_in || record.time_out) && (
                  <p className="text-xs text-muted-foreground">
                    {record.time_in && (
                      <span>Time In: {formatTime(record.time_in)}</span>
                    )}
                    {record.time_in && record.time_out && ' | '}
                    {record.time_out && (
                      <span>Time Out: {formatTime(record.time_out)}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Badge 
              variant={type === 'present' ? 'default' : 'destructive'}
              className="flex-shrink-0"
            >
              {type === 'present' ? 'Present' : 'Absent'}
            </Badge>
          </div>
        ))}
      </div>
    );
  };

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

        {/* Attendance Tabs */}
        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              View detailed attendance history for {student.full_name || 'this student'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="present" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="present" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Present ({presentRecords.length})
                </TabsTrigger>
                <TabsTrigger value="absent" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Absences ({absentRecords.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="present" className="mt-4">
                {renderAttendanceList(presentRecords, 'present')}
              </TabsContent>
              <TabsContent value="absent" className="mt-4">
                {renderAttendanceList(absentRecords, 'absent')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
