import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileCheck } from "lucide-react";
import ActivityFileUpload from "@/components/instructor/ActivityFileUpload";
import ActivityFilesList from "@/components/instructor/ActivityFilesList";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface Course {
  id: string;
  title: string;
  description: string;
  course_code: string;
}

const ActivitiesDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshFiles, setRefreshFiles] = useState(0);

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
    <div className="trackademic-container">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/instructor-dashboard/course/${courseId}`)}
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{course.title} - Activities</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Upload and manage activity files</p>
          </div>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Upload Activity Files</CardTitle>
            <CardDescription>
              Share course materials, assignments, and resources with your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFileUpload
              courseId={course.id}
              onUploadSuccess={() => setRefreshFiles(prev => prev + 1)}
            />
          </CardContent>
        </Card>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              Manage all activity files for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFilesList
              courseId={course.id}
              refreshTrigger={refreshFiles}
            />
          </CardContent>
        </Card>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>
              View and manage student submissions for course activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={() => navigate(`/instructor-dashboard/course/${courseId}/submissions`)}
            >
              <FileCheck className="h-4 w-4" />
              View Submissions
            </Button>
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default ActivitiesDashboard;
