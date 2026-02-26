import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CourseOption = {
  id: string;
  title: string;
  course_code: string | null;
};

type StudentRow = {
  student_id: string;
  full_name: string;
  email: string | null;
  midterm_score: string;
  final_score: string;
};

type ExamScoreRow = {
  student_id: string;
  course_id: string;
  midterm_score: number | null;
  final_score: number | null;
};

export default function InstructorScoresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstructorCourses = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/");
        return;
      }

      const role = session.user.user_metadata?.role;
      if (role !== "instructor") {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, title, course_code")
        .eq("instructor_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        setError("Failed to load courses.");
        setLoading(false);
        return;
      }

      setCourses((data || []) as CourseOption[]);
      setLoading(false);
    };

    loadInstructorCourses();
  }, [navigate]);

  useEffect(() => {
    const loadStudentsAndScores = async () => {
      if (!selectedCourseId) {
        setStudents([]);
        return;
      }

      setError(null);
      setSaving(false);

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("student_id, profiles ( full_name, email )")
        .eq("course_id", selectedCourseId);

      if (enrollError) {
        setError("Failed to load students.");
        return;
      }

      const { data: scores, error: scoresError } = await supabase
        .from("exam_scores")
        .select("student_id, course_id, midterm_score, final_score")
        .eq("course_id", selectedCourseId);

      if (scoresError) {
        // If the table doesn't exist yet or RLS blocks, we just show blank scores.
        console.warn("Error loading exam_scores:", scoresError);
      }

      const scoreMap = new Map<string, ExamScoreRow>();
      (scores || []).forEach((row: any) => {
        scoreMap.set(row.student_id, row as ExamScoreRow);
      });

      const rows: StudentRow[] = (enrollments || []).map((enrollment: any) => {
        const profile = enrollment.profiles;
        const score = scoreMap.get(enrollment.student_id);
        return {
          student_id: enrollment.student_id,
          full_name: profile?.full_name || "Student",
          email: profile?.email || null,
          midterm_score:
            score && score.midterm_score != null
              ? String(score.midterm_score)
              : "",
          final_score:
            score && score.final_score != null
              ? String(score.final_score)
              : "",
        };
      });

      setStudents(rows);
    };

    loadStudentsAndScores();
  }, [selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const handleScoreChange = (
    studentId: string,
    field: "midterm_score" | "final_score",
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    if (!selectedCourseId || students.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const payload = students.map((s) => ({
        course_id: selectedCourseId,
        student_id: s.student_id,
        midterm_score: s.midterm_score.trim()
          ? Number(s.midterm_score.trim())
          : null,
        final_score: s.final_score.trim()
          ? Number(s.final_score.trim())
          : null,
      }));

      const { error } = await supabase.from("exam_scores").upsert(payload, {
        onConflict: "course_id,student_id",
      } as any);

      if (error) {
        console.error("Error saving exam_scores:", error);
        setError("Failed to save scores. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-4xl mx-auto space-y-4 mb-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => navigate("/instructor-dashboard")}
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold">Exam Scores</h1>
          <div className="w-10" />
        </div>

        <Card className="trackademic-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedCourseId || ""}
              onValueChange={(value) => setSelectedCourseId(value || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {course.course_code ? ` (${course.course_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground">
                Recording exam scores for{" "}
                <span className="font-medium">{selectedCourse.title}</span>.
              </p>
            )}
          </CardContent>
        </Card>

        {selectedCourseId && (
          <Card className="trackademic-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Students (Midterm &amp; Finals)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <p className="text-sm text-destructive mb-2">{error}</p>
              )}
              {students.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">
                  No students enrolled in this course yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {students.map((s) => (
                    <div
                      key={s.student_id}
                      className="rounded-xl border border-border/70 px-3 py-3 space-y-2"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div>
                          <p className="text-sm font-medium">{s.full_name}</p>
                          {s.email && (
                            <p className="text-xs text-muted-foreground">
                              {s.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Midterm
                          </p>
                          <Input
                            inputMode="decimal"
                            value={s.midterm_score}
                            onChange={(e) =>
                              handleScoreChange(
                                s.student_id,
                                "midterm_score",
                                e.target.value
                              )
                            }
                            placeholder="e.g. 85"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Finals
                          </p>
                          <Input
                            inputMode="decimal"
                            value={s.final_score}
                            onChange={(e) =>
                              handleScoreChange(
                                s.student_id,
                                "final_score",
                                e.target.value
                              )
                            }
                            placeholder="e.g. 90"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="w-full mt-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Exam Scores"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}

