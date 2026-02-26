import { useState, useEffect } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, QrCode, ClipboardList, BookOpen, Copy, FileText, Radio } from "lucide-react";
import ProjectedGradesList from "@/components/instructor/ProjectedGradesList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  created_at: string;
}
const CourseDashboard = () => {
  const {
    courseId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        navigate("/instructor-dashboard");
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('courses').select('id, title, description, course_code, created_at').eq('id', courseId).single();
        if (error || !data) {
          toast({
            title: "Error",
            description: "Course not found.",
            variant: "destructive"
          });
          navigate("/instructor-dashboard");
          return;
        }
        setCourse(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive"
        });
        navigate("/instructor-dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, navigate, toast]);
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Course code copied to clipboard."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy course code.",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!course) {
    return null;
  }
  return <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/instructor-dashboard")} className="mb-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {course.title}
            </h1>
            {course.description && <p className="text-muted-foreground text-sm">{course.description}</p>}
            {course.course_code && <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-semibold">Course Code:</span>
                <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {course.course_code}
                </span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(course.course_code!)} className="h-8 w-8 p-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Button variant="outline" size="lg" onClick={() => navigate(`/instructor-dashboard/course/${courseId}/students`)} className="h-auto py-4 flex-col gap-2 text-sm">
            <Users className="h-5 w-5" />
            <span>Students</span>
          </Button>
          
          <Button variant="outline" size="lg" onClick={() => navigate(`/instructor-dashboard/course/${courseId}/attendance`)} className="h-auto py-4 flex-col gap-2 text-sm">
            <ClipboardList className="h-5 w-5" />
            <span>Attendance</span>
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate(`/instructor-dashboard/course/${courseId}/activities`)} className="h-auto py-4 flex-col gap-2 text-sm">
            <FileText className="h-5 w-5" />
            <span>Activities</span>
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate(`/instructor-dashboard/course/${courseId}/sessions`)} className="h-auto py-4 flex-col gap-2 text-sm">
            <Radio className="h-5 w-5" />
            <span>Sessions</span>
          </Button>
        </div>

        {/* Projected Grades */}
        {courseId && (
          <div className="mb-6">
            <ProjectedGradesList courseId={courseId} courseName={course.title} />
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>;
};
export default CourseDashboard;