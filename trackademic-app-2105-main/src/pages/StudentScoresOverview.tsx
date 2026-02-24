import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileBarChart } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface EnrolledCourse {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function StudentScoresOverview() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEnrolledCourses(session.user.id);
      }
      setLoading(false);
    };
    getSession();
  }, []);

  const fetchEnrolledCourses = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            course_code
          )
        `)
        .eq("student_id", userId);

      if (error) throw error;

      const courses = data
        ?.map((enrollment: { courses: EnrolledCourse }) => enrollment.courses)
        .filter(Boolean) as EnrolledCourse[];
      setEnrolledCourses(courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const userRole = user.user_metadata?.role;
  if (userRole !== "student") return <Navigate to="/" replace />;

  return (
    <div className="trackademic-container">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-primary" />
            My Scores
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a course to view your scores.
          </p>
        </div>

        <Card className="trackademic-card">
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>
              Click on a course to view your scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length > 0 ? (
              <div className="grid gap-3">
                {enrolledCourses.map((course) => (
                  <Button
                    key={course.id}
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3"
                    onClick={() => navigate(`/student-dashboard/course/${course.id}/scores`)}
                  >
                    <BookOpen className="h-5 w-5 shrink-0" />
                    <span className="text-left">{course.title}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No courses enrolled. Enroll in a course from the Courses tab to view scores.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
