import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Bell, User, FileBarChart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const getRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setRole(session.user.user_metadata?.role || null);
        fetchUnread(session.user.id);
      }
    };
    getRole();
  }, []);

  const fetchUnread = async (userId: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadCount(count || 0);
  };

  if (!role) return null;

  const basePath = role === "instructor"
    ? "/instructor-dashboard"
    : role === "parent"
      ? "/parent-dashboard"
      : "/student-dashboard";

  const navItems = role === "student"
    ? [
        { icon: BookOpen, label: "Courses", path: "/student-dashboard", exact: true },
        { icon: Bell, label: "Alert", path: "/student-dashboard/alerts" },
        { icon: FileBarChart, label: "Scores", path: "/student-dashboard/scores" },
        { icon: User, label: "Profile", path: "/student-dashboard/profile" },
      ]
    : [
        { icon: BookOpen, label: "Courses", path: `${basePath}`, exact: true },
        { icon: Bell, label: "Alert", path: `${basePath}/alerts` },
        { icon: FileBarChart, label: "Scores", path: `${basePath}/scores` },
        { icon: User, label: "Profile", path: `${basePath}/profile` },
      ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[hsl(222,45%,9%)]/95 backdrop-blur-xl sm:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path, "exact" in item ? item.exact : undefined);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all duration-200 relative",
                active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default MobileBottomNav;
