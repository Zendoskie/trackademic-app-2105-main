import { useEffect, useState } from "react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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

interface ExamScores {
  midterm_score: number | null;
  final_score: number | null;
}

const StudentScoresDashboard = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [scores, setScores] = useState<ExamScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: sessionData }, { data: courseData, error: courseError }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("courses")
            .select("id, title, description, course_code")
            .eq("id", courseId)
            .maybeSingle(),
        ]);

        const session = sessionData.session;
        if (!session) {
          navigate("/");
          return;
        }

        setUserRole(session.user.user_metadata?.role || null);

        if (courseError || !courseData) {
          navigate("/student-dashboard");
          return;
        }

        setCourse(courseData as Course);

        const { data: scoreRow } = await supabase
          .from("exam_scores")
          .select("midterm_score, final_score")
          .eq("course_id", courseId)
          .eq("student_id", session.user.id)
          .maybeSingle();

        if (scoreRow) {
          setScores({
            midterm_score: scoreRow.midterm_score,
            final_score: scoreRow.final_score,
          });
        } else {
          setScores(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole && userRole !== "student") {
    return <Navigate to="/" replace />;
  }

  if (!course) return null;

  const hasScores = scores && (scores.midterm_score != null || scores.final_score != null);

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
            <p className="text-sm text-muted-foreground">Scores</p>
          </div>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>My Scores</CardTitle>
            <CardDescription>Midterm and final exam results for this course.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasScores ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Midterm</p>
                  <p className="text-lg font-semibold">
                    {scores?.midterm_score != null ? scores.midterm_score : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Finals</p>
                  <p className="text-lg font-semibold">
                    {scores?.final_score != null ? scores.final_score : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Exam scores are not yet available for this course.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default StudentScoresDashboard;
