import { useState, useEffect } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SessionManager } from "@/components/instructor/SessionManager";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

const SessionDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        navigate("/instructor-dashboard");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, course_code')
          .eq('id', courseId)
          .single();

        if (error || !data) {
          toast({
            title: "Error",
            description: "Course not found.",
            variant: "destructive",
          });
          navigate("/instructor-dashboard");
          return;
        }

        setCourse(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
        navigate("/instructor-dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {course.title} - Sessions
          </h1>
          <p className="text-muted-foreground">
            Manage class sessions and mark student attendance
          </p>
        </div>

        <SessionManager courseId={courseId!} />
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default SessionDashboard;
