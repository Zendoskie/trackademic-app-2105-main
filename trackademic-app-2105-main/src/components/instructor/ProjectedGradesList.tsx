import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchProjectedGradesForStudents, ProjectedGradeData } from "@/hooks/useProjectedGrade";

interface EnrolledStudent {
  student_id: string;
  profiles: { full_name: string | null } | null;
}

interface ProjectedGradesListProps {
  courseId: string;
  courseName: string;
}

export default function ProjectedGradesList({ courseId, courseName }: ProjectedGradesListProps) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [grades, setGrades] = useState<Record<string, ProjectedGradeData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const { data: enrollmentsData, error } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", courseId);

        if (error || !enrollmentsData) {
          setStudents([]);
          return;
        }

        const studentIds = (enrollmentsData || []).map((e) => e.student_id);
        let profileMap: Record<string, { full_name: string | null }> = {};
        if (studentIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", studentIds);
          if (profilesData) {
            profileMap = Object.fromEntries(profilesData.map((p) => [p.id, { full_name: p.full_name }]));
          }
        }

        const studentList = studentIds.map((sid) => ({
          student_id: sid,
          profiles: profileMap[sid] ?? null,
        }));

        if (cancelled) return;
        setStudents(studentList);

        const gradesMap = await fetchProjectedGradesForStudents(courseId, studentIds);
        if (!cancelled) setGrades(gradesMap);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [courseId]);

  if (loading) {
    return (
      <Card className="trackademic-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" />
            Projected Grades
          </CardTitle>
          <CardDescription>By student performance (activities + attendance)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="trackademic-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" />
            Projected Grades
          </CardTitle>
          <CardDescription>By student performance (activities + attendance)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">No students enrolled yet.</p>
        </CardContent>
      </Card>
    );
  }

  const gradeColor = (letter: string) => {
    if (letter === "A") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (letter === "B") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (letter === "C") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (letter === "D") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    if (letter === "F") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card className="trackademic-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" />
          Projected Grades
        </CardTitle>
        <CardDescription>
          Based on activities (70%) and attendance (30%) per student
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {students.map((s) => {
            const g = grades[s.student_id];
            const letter = g?.letterGrade ?? "-";
            const pct = g?.percentage ?? 0;
            return (
              <div
                key={s.student_id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {s.profiles?.full_name || "Unknown"}
                  </p>
                  {g && (g.activitiesTotal > 0 || g.totalAttendance > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {g.activitiesEarned}/{g.activitiesTotal} pts · {g.presentCount}/{g.totalAttendance} present
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={gradeColor(letter)}>
                    {letter} {pct > 0 ? `(${pct.toFixed(0)}%)` : ""}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/instructor-dashboard/course/${courseId}/students`)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
