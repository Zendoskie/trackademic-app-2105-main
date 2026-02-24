import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Bell, User, Settings, FileBarChart } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUnread = async (userId: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadCount(count || 0);
  };

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

  // Refetch unread when returning to app (e.g. from Alerts page after marking read)
  useEffect(() => {
    if (!role) return;
    const onFocus = () => {
      supabase.auth.getUser().then(({ data: { user } }) => user && fetchUnread(user.id));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [role]);

  // Realtime: refresh unread count when notifications change
  useEffect(() => {
    if (!role) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channelRef.current = supabase
        .channel("nav-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => fetchUnread(user.id)
        )
        .subscribe();
    })();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [role]);

  if (!role) return null;

  const basePath = role === "instructor"
    ? "/instructor-dashboard"
    : role === "parent"
      ? "/parent-dashboard"
      : "/student-dashboard";

  const navItems = role === "student"
    ? [
        { icon: BookOpen, label: "Courses", path: "/student-dashboard", exact: true },
        { icon: Bell, label: "Notification", path: "/student-dashboard/alerts", showUnread: true },
        { icon: User, label: "Profile", path: "/student-dashboard/profile" },
        { icon: Settings, label: "Settings", path: "/student-dashboard/settings" },
      ]
    : [
        { icon: BookOpen, label: "Courses", path: `${basePath}`, exact: true },
        { icon: Bell, label: "Notification", path: `${basePath}/alerts`, showUnread: true },
        { icon: FileBarChart, label: "Scores", path: `${basePath}/scores` },
        { icon: User, label: "Profile", path: `${basePath}/profile` },
      ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl sm:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path, "exact" in item ? item.exact : undefined);
          const showBadge = "showUnread" in item && item.showUnread && unreadCount > 0;
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
              <span className="relative inline-flex">
                <item.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
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
