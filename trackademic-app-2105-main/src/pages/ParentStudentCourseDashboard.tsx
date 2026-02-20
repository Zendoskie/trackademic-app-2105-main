import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, ClipboardList, FileText } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { ProjectedGradeCard } from "@/components/shared/ProjectedGradeCard";
import { useProjectedGrade } from "@/hooks/useProjectedGrade";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function ParentStudentCourseDashboard() {
  const { studentId, courseId } = useParams<{ studentId: string; courseId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();
  const projectedGrade = useProjectedGrade(courseId || undefined, studentId || undefined);

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
      // Check if parent has link to this student
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

      // Fetch student name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .single();

      if (profileData) {
        setStudentName(profileData.full_name || "Student");
      }

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, course_code')
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
          <p className="text-destructive mb-4">You are not authorized to view this student's course.</p>
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
            onClick={() => navigate(`/parent-dashboard/student/${studentId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {studentName}'s Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="trackademic-brand text-3xl mb-2">TRACKADEMIC</h1>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                {course.title}
              </h2>
              <p className="text-muted-foreground">Viewing as parent of {studentName}</p>
              {course.description && (
                <p className="text-muted-foreground mt-2">{course.description}</p>
              )}
              {course.course_code && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm font-semibold">Course Code:</span>
                  <span className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded">
                    {course.course_code}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projected Grade */}
        {studentId && courseId && (
          <div className="mb-8">
            <ProjectedGradeCard data={projectedGrade} courseTitle={course.title} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/parent-dashboard/student/${studentId}/course/${courseId}/attendance`)}
            className="h-auto py-6 flex-col gap-2"
          >
            <ClipboardList className="h-6 w-6" />
            <span>Attendance History</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/parent-dashboard/student/${studentId}/course/${courseId}/activities`)}
            className="h-auto py-6 flex-col gap-2"
          >
            <FileText className="h-6 w-6" />
            <span>Activities & Submissions</span>
          </Button>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
