import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnrolledStudentsList from "@/components/instructor/EnrolledStudentsList";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  created_at: string;
}

const CourseStudentsDashboard = () => {
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
          .select('id, title, description, course_code, created_at')
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
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                {course.title} - Students
              </h1>
              <p className="text-muted-foreground">Manage enrolled students for this course</p>
            </div>
          </div>
        </div>

        {/* Students List */}
        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrolledStudentsList 
              courseId={course.id} 
              courseName={course.title}
            />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default CourseStudentsDashboard;
