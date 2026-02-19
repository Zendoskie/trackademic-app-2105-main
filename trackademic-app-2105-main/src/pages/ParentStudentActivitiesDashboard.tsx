import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import ActivityFilesList from "@/components/instructor/ActivityFilesList";
import StudentSubmissionsList from "@/components/student/StudentSubmissionsList";

interface Course {
  id: string;
  title: string;
}

interface ActivityFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description: string | null;
  uploaded_at: string;
}

export default function ParentStudentActivitiesDashboard() {
  const { studentId, courseId } = useParams<{ studentId: string; courseId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [activityFiles, setActivityFiles] = useState<ActivityFile[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user && studentId && courseId) {
        await checkAuthorizationAndFetchData(session.user.id, studentId, courseId);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [studentId, courseId]);

  const checkAuthorizationAndFetchData = async (parentId: string, studentId: string, courseId: string) => {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('parent_students')
        .select('id')
        .eq('parent_id', parentId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (linkError || !linkData) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .single();

      if (profileData) {
        setStudentName(profileData.full_name || "Student");
      }

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive",
        });
        navigate(`/parent-dashboard/student/${studentId}`);
        return;
      }

      setCourse(courseData);

      // Fetch activity files
      const { data: filesData } = await supabase
        .from('activity_files')
        .select('*')
        .eq('course_id', courseId)
        .order('uploaded_at', { ascending: false });

      if (filesData) {
        setActivityFiles(filesData);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.user_metadata?.role !== "parent") {
    navigate("/");
    return null;
  }

  if (!isAuthorized) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">You are not authorized to view this.</p>
          <Button onClick={() => navigate('/parent-dashboard')}>
            Go Back
          </Button>
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
            onClick={() => navigate(`/parent-dashboard/student/${studentId}/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {course.title}
          </Button>
          <div>
            <h1 className="trackademic-brand text-3xl mb-2">TRACKADEMIC</h1>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Activities & Submissions
            </h2>
            <p className="text-muted-foreground">{studentName} - {course.title}</p>
          </div>
        </div>

        {/* Course Materials */}
        <Card className="trackademic-card mb-6">
          <CardHeader>
            <CardTitle>Course Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFilesList
              courseId={courseId!}
              showDelete={false}
            />
          </CardContent>
        </Card>

        {/* Student Submissions */}
        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>{studentName}'s Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentSubmissionsList courseId={courseId!} studentId={studentId} />
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
