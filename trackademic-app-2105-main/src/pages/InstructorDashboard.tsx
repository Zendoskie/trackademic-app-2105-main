import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CreateCourseDialog from "@/components/instructor/CreateCourseDialog";
import CourseList from "@/components/instructor/CourseList";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

const InstructorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication and get user
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate("/");
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes - only redirect on explicit sign-out, not on token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCourseCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="trackademic-brand text-2xl sm:text-3xl mb-1">
            TRACKADEMIC
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Welcome back, {user?.user_metadata?.full_name || "Instructor"}!
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* My Courses */}
          <Card className="trackademic-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                My Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Manage your courses and curriculum</p>
              <div className="space-y-4">
                <CreateCourseDialog onCourseCreated={handleCourseCreated} />
                <CourseList refreshTrigger={refreshTrigger} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default InstructorDashboard;