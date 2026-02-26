import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

interface LinkedStudent {
  id: string;
  full_name: string;
  email: string | null;
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchLinkedStudents(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchLinkedStudents(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchLinkedStudents = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          student_id,
          profiles!parent_students_student_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('parent_id', parentId);

      if (error) {
        console.error('Error fetching linked students:', error);
        return;
      }

      const students = data
        ?.map((link: any) => link.profiles)
        .filter(Boolean) as LinkedStudent[];
      
      setLinkedStudents(students || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/parent-dashboard/student/${studentId}`);
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

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Parent";

  return (
    <div className="trackademic-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 space-y-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="trackademic-brand text-2xl mb-1">Trackacademic</h1>
            <h2 className="text-foreground text-lg">Welcome back, {userName}!</h2>
            <p className="text-muted-foreground text-sm">Monitor your student's academic progress</p>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="mb-8">
          <Card className="trackademic-card max-w-4xl mx-auto">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Linked Students ({linkedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedStudents.length > 0 ? (
                <div className="space-y-3">
                  {linkedStudents.map((student) => (
                    <Card 
                      key={student.id} 
                      className="bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleViewStudent(student.id)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          {student.email && (
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No students linked to your account yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
