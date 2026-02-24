import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardList } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AttendanceCard from "@/components/shared/AttendanceCard";

interface Course {
  id: string;
  title: string;
}

interface Student {
  id: string;
  full_name: string;
}

export default function ParentStudentAttendanceDashboard() {
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !studentId) return;

      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch student details
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load page details.",
          variant: "destructive",
        });
        navigate('/parent-dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, studentId, navigate, toast]);

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance history...</p>
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
            onClick={() => navigate(`/parent-dashboard/student/${studentId}/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div className="flex items-start gap-4">
            <ClipboardList className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {student.full_name}'s Attendance
              </h1>
              <p className="text-muted-foreground">
                {course.title}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance History Card */}
        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              Viewing all of {student.full_name}'s records for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceCard
              courseId={courseId!}
              studentId={studentId!}
              studentName={student.full_name}
            />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
