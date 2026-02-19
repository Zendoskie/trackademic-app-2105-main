import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardList } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AttendanceHistoryList from "@/components/instructor/AttendanceHistoryList";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function StudentAttendanceHistoryDashboard() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, course_code')
          .eq('id', courseId)
          .single();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to load course details",
            variant: "destructive",
          });
          navigate('/student-dashboard');
          return;
        }

        setCourse(data);
      } catch (error) {
        console.error('Error fetching course:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        navigate('/student-dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate, toast]);

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

  if (!course) {
    return null;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/student-dashboard/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div className="flex items-start gap-4">
            <ClipboardList className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Attendance History
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
            <CardTitle>My Attendance Records</CardTitle>
            <CardDescription>
              View all your attendance records for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUserId && (
              <AttendanceHistoryList 
                courseId={courseId!} 
                studentId={currentUserId}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
