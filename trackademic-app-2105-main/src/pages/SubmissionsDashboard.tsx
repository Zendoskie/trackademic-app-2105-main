import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import SubmissionsDashboard from "@/components/instructor/SubmissionsDashboard";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface Course {
  id: string;
  title: string;
  description: string;
  course_code: string;
}

const SubmissionsDashboardPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (error) throw error;
        setCourse(data);
      } catch (error) {
        console.error("Error fetching course:", error);
        navigate("/instructor-dashboard");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}/activities`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{course.title} - Submissions</h1>
            <p className="text-muted-foreground">View and manage student activity submissions</p>
          </div>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>
              Select a student to view their submitted activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionsDashboard courseId={course.id} />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default SubmissionsDashboardPage;
