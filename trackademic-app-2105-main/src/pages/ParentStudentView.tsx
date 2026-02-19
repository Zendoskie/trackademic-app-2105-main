import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string | null;
}

interface EnrolledCourse {
  id: string;
  title: string;
  description: string | null;
  course_code: string | null;
}

export default function ParentStudentView() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user && studentId) {
        await checkAuthorization(session.user.id, studentId);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [studentId]);

  const checkAuthorization = async (parentId: string, studentId: string) => {
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

      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', studentId)
        .single();

      if (profileError || !profileData) {
        console.error('Error fetching student profile:', profileError);
        return;
      }

      setStudent(profileData);

      // Fetch enrolled courses
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
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
        .eq('student_id', studentId);

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        return;
      }

      const courses = enrollmentsData
        ?.map((enrollment: any) => enrollment.courses)
        .filter(Boolean) as EnrolledCourse[];
      
      setEnrolledCourses(courses || []);
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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = user.user_metadata?.role;
  if (userRole !== "parent") {
    return <Navigate to="/" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="trackademic-container flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">You are not authorized to view this student's account.</p>
          <Button onClick={() => navigate('/parent-dashboard')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/parent-dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="trackademic-brand text-3xl mb-2">TRACKADEMIC</h1>
            <h2 className="text-foreground">Viewing: {student?.full_name}</h2>
            {student?.email && (
              <p className="text-muted-foreground">{student.email}</p>
            )}
          </div>
        </div>

        {/* Student's Enrolled Courses */}
        <Card className="trackademic-card max-w-4xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Enrolled Subjects ({enrolledCourses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {enrolledCourses.map((course) => (
                  <Card 
                    key={course.id} 
                    className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/parent-dashboard/student/${studentId}/course/${course.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-primary">
                        {course.title}
                      </CardTitle>
                    </CardHeader>
                {course.course_code && (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          Code: {course.course_code}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                This student is not enrolled in any courses yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <MobileBottomNav />
    </div>
  );
}
