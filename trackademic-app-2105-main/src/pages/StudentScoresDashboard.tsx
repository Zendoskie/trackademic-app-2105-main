import { useEffect, useState } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  course_code: string;
}

const StudentScoresDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, description, course_code")
          .eq("id", courseId)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (error) {
        console.error("Error fetching course:", error);
        navigate("/student-dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/student-dashboard/course/${courseId}`)}
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{course.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Scores</p>
          </div>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>My Scores</CardTitle>
            <CardDescription>
              View your scores for this course.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Scores are not yet available.
            </p>
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default StudentScoresDashboard;
