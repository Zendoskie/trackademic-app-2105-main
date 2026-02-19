import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, FileText, QrCode, ClipboardList } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import QRScanner from "@/components/student/QRScanner";
import AttendanceHistoryList from "@/components/instructor/AttendanceHistoryList";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function StudentCourseDashboard() {
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
          <p className="text-muted-foreground">Loading course...</p>
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
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student-dashboard')}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              {course.title}
            </h1>
            {course.description && (
              <p className="text-muted-foreground text-sm sm:text-base">{course.description}</p>
            )}
            {course.course_code && (
              <div className="flex items-center gap-2 mt-2 sm:mt-3">
                <span className="text-xs sm:text-sm font-semibold">Course Code:</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-mono bg-muted px-2 sm:px-3 py-1 sm:py-1.5 rounded">
                  {course.course_code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/student-dashboard/course/${courseId}/qr-scanner`)}
            className="h-auto py-4 sm:py-6 flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>QR Scanner</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/student-dashboard/course/${courseId}/attendance`)}
            className="h-auto py-4 sm:py-6 flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Attendance</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/student-dashboard/course/${courseId}/activities`)}
            className="h-auto py-4 sm:py-6 flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Activities</span>
          </Button>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
