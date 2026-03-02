import { useEffect, useState } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload as UploadIcon, BookOpen, FileText } from "lucide-react";
import ActivityFilesList from "@/components/instructor/ActivityFilesList";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ActivitySubmissionForm from "@/components/student/ActivitySubmissionForm";
import StudentSubmissionsList from "@/components/student/StudentSubmissionsList";
import { Badge } from "@/components/ui/badge";
interface Course {
  id: string;
  title: string;
  description: string;
  course_code: string;
}

interface ActivityFileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  description: string | null;
  points: number | null;
}

const StudentActivitiesDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityFiles, setActivityFiles] = useState<ActivityFileRow[]>([]);
  const [refreshSubmissions, setRefreshSubmissions] = useState(0);

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

    const fetchActivityFiles = async () => {
      try {
        const { data, error } = await supabase
          .from("activity_files")
          .select("*")
          .eq("course_id", courseId)
          .order("uploaded_at", { ascending: false });

        if (error) throw error;
        setActivityFiles(data || []);
      } catch (error) {
        console.error("Error fetching activity files:", error);
      }
    };

    if (courseId) {
      fetchCourse();
      fetchActivityFiles();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/student-dashboard/course/${courseId}`)}
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight truncate">{course.title}</h1>
            <p className="text-sm text-muted-foreground">Activities & Submissions</p>
          </div>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Course Materials</CardTitle>
            <CardDescription>
              Files and materials uploaded by your instructor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFilesList courseId={course.id} refreshTrigger={0} showDelete={false} />
          </CardContent>
        </Card>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Submit Activities</CardTitle>
            <CardDescription>
              Upload your completed activities for each assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityFiles.filter(f => f.category === "activity").length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No activities available yet
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {activityFiles
                  .filter((file) => file.category === "activity")
                  .map((file) => (
                    <AccordionItem key={file.id} value={file.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{file.file_name}</span>
                          {file.points && (
                            <Badge variant="secondary" className="ml-2">
                              {file.points} pts
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4 space-y-4">
                          {file.description && (
                            <p className="text-sm text-muted-foreground">{file.description}</p>
                          )}
                          <ActivitySubmissionForm
                            activityFileId={file.id}
                            courseId={course.id}
                            onSubmitSuccess={() => setRefreshSubmissions(prev => prev + 1)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>My Submissions</CardTitle>
            <CardDescription>
              View all your submitted activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentSubmissionsList
              courseId={course.id}
              refreshTrigger={refreshSubmissions}
            />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default StudentActivitiesDashboard;
