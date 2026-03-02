import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

type Child = {
  id: string;
  full_name: string;
};

type CourseScore = {
  course_id: string;
  course_title: string;
  student_id: string;
  midterm_score: number | null;
  final_score: number | null;
};

export default function ParentScoresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [scoresByChild, setScoresByChild] = useState<Record<string, CourseScore[]>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/");
          return;
        }

        const role = session.user.user_metadata?.role || null;
        setUserRole(role);
        if (role !== "parent") {
          return;
        }

        const { data: links, error: linksError } = await supabase
          .from("parent_students")
          .select(
            `
            student_id,
            profiles!parent_students_student_id_fkey (
              id,
              full_name
            )
          `,
          )
          .eq("parent_id", session.user.id);

        if (linksError || !links || links.length === 0) {
          setChildren([]);
          setScoresByChild({});
          return;
        }

        type LinkRow = { profiles: { id: string; full_name: string } | null };
        const kids: Child[] = (links as LinkRow[])
          .map((row) => row.profiles)
          .filter(Boolean)
          .map((p) => ({
            id: p.id,
            full_name: p.full_name || "Student",
          }));

        setChildren(kids);

        const studentIds = kids.map((k) => k.id);
        if (studentIds.length === 0) {
          setScoresByChild({});
          return;
        }

        const { data: scores, error: scoresError } = await supabase
          .from("exam_scores")
          .select(
            `
            student_id,
            course_id,
            midterm_score,
            final_score,
            courses (
              id,
              title
            )
          `,
          )
          .in("student_id", studentIds);

        if (scoresError || !scores) {
          setScoresByChild({});
          return;
        }

        const grouped: Record<string, CourseScore[]> = {};

        type ScoreRow = { student_id: string; course_id: string; midterm_score: number | null; final_score: number | null; courses: { id: string; title: string } | null };
        (scores as ScoreRow[]).forEach((row) => {
          const course = row.courses;
          if (!course) return;
          const entry: CourseScore = {
            course_id: course.id,
            course_title: course.title,
            student_id: row.student_id,
            midterm_score: row.midterm_score,
            final_score: row.final_score,
          };
          if (!grouped[row.student_id]) {
            grouped[row.student_id] = [];
          }
          grouped[row.student_id].push(entry);
        });

        setScoresByChild(grouped);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (userRole && userRole !== "parent") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-4xl mx-auto mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => navigate("/parent-dashboard")}
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold">Exam Scores</h1>
          <div className="w-10" />
        </div>

        {children.length === 0 ? (
          <Card className="trackademic-card">
            <CardHeader>
              <CardTitle className="text-base">No linked students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Link a student account to see their exam scores.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {children.map((child) => {
              const scores = scoresByChild[child.id] || [];
              return (
                <Card key={child.id} className="trackademic-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {child.full_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No exam scores recorded yet for this student.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {scores.map((score) => (
                          <div
                            key={`${score.course_id}-${score.student_id}`}
                            className="rounded-xl border border-border/70 px-3 py-3 space-y-1"
                          >
                            <p className="text-sm font-medium">
                              {score.course_title}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">
                                  Midterm
                                </p>
                                <p className="text-base font-semibold">
                                  {score.midterm_score != null
                                    ? score.midterm_score
                                    : "—"}
                                </p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">
                                  Finals
                                </p>
                                <p className="text-base font-semibold">
                                  {score.final_score != null
                                    ? score.final_score
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/parent-dashboard")}
        >
          Back to Parent Dashboard
        </Button>
      </div>
      <MobileBottomNav />
    </div>
  );
}

