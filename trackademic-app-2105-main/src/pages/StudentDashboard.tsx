import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface EnrolledCourse {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnrollInput, setShowEnrollInput] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEnrolledCourses(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEnrolledCourses(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEnrolledCourses = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            course_code
          )
        `)
        .eq('student_id', userId);

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      type EnrollmentRow = { courses: EnrolledCourse | null };
      const courses = (data as EnrollmentRow[] | null)
        ?.map((enrollment) => enrollment.courses)
        .filter(Boolean) as EnrolledCourse[];
      
      setEnrolledCourses(courses || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEnroll = async () => {
    if (!courseCode.trim() || !user) return;

    setEnrolling(true);
    try {
      // First, find the course by code using the SECURITY DEFINER function
      const { data: courseData, error: courseError } = await supabase
        .rpc('get_course_by_code', { _course_code: courseCode.trim().toUpperCase() })
        .maybeSingle();

      if (courseError || !courseData) {
        toast({
          title: "Error",
          description: "Invalid course code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseData.id)
        .maybeSingle();

      if (existingEnrollment) {
        toast({
          title: "Already enrolled",
          description: "You are already enrolled in this course.",
          variant: "destructive",
        });
        return;
      }

      // Enroll the student
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          student_id: user.id,
          course_id: courseData.id,
        });

      if (enrollError) {
        toast({
          title: "Error",
          description: "Failed to enroll in course. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: `You've been enrolled in ${courseData.title}`,
      });

      // Refresh enrolled courses
      fetchEnrolledCourses(user.id);
      setShowEnrollInput(false);
      setCourseCode("");
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user is a student (from metadata)
  const userRole = user.user_metadata?.role;
  if (userRole !== "student") {
    return <Navigate to="/" replace />;
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-0 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="trackademic-brand text-2xl mb-1">Trackacademic</h1>
            <h2 className="text-foreground text-base">Welcome back, {userName}!</h2>
            <p className="text-muted-foreground text-sm">Ready to continue your academic journey?</p>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="mb-8">
          {/* My Subjects */}
          <Card className="trackademic-card max-w-4xl mx-auto">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                My Subjects ({enrolledCourses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrolledCourses.length > 0 && (
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {enrolledCourses.map((course) => (
                    <Card 
                      key={course.id} 
                      className="bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/student-dashboard/course/${course.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {course.title}
                        </CardTitle>
                      </CardHeader>
                      {course.description && (
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground">
                            {course.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowEnrollInput(!showEnrollInput)}
                >
                  Enroll New Subject
                </Button>
                {showEnrollInput && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter course code"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={handleEnroll}
                        disabled={enrolling || !courseCode.trim()}
                      >
                        {enrolling ? "Enrolling..." : "Enroll"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setShowEnrollInput(false);
                          setCourseCode("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}