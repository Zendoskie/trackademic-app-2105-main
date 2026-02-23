import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LogOut, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    role: string | null;
    username: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const basePath = location.pathname.startsWith("/instructor-dashboard")
    ? "/instructor-dashboard"
    : location.pathname.startsWith("/parent-dashboard")
      ? "/parent-dashboard"
      : "/student-dashboard";

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate("/");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, role, username")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(
        profileData || {
          full_name: session.user.user_metadata?.full_name || null,
          email: session.user.email || null,
          role: session.user.user_metadata?.role || null,
          username: session.user.user_metadata?.username || null,
        }
      );
      setLoading(false);
    };

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect on explicit sign-out; avoid redirecting during token refresh or transient null
      if (event === "SIGNED_OUT") {
        navigate("/");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return "User";
    const labels: Record<string, string> = {
      instructor: "Instructor",
      student: "Student",
      parent: "Parent",
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="trackademic-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="trackademic-container min-h-screen pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(basePath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="trackademic-brand text-xl">TRACKADEMIC</h1>
          <div className="w-20" />
        </div>

        <h2 className="text-lg font-semibold mb-4">Profile</h2>

        <Card className="trackademic-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5" />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="font-medium">
                {profile?.full_name || user?.user_metadata?.full_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                <Mail className="h-3.5 w-3" />
                Email
              </p>
              <p className="font-medium">{profile?.email || user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Role</p>
              <p className="font-medium">{getRoleLabel(profile?.role || null)}</p>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <MobileBottomNav />
    </div>
  );
}
