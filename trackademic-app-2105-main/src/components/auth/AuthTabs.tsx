import { cn } from "@/lib/utils";

interface AuthTabsProps {
  activeTab: "signin" | "signup";
  onTabChange: (tab: "signin" | "signup") => void;
}

export const AuthTabs = ({ activeTab, onTabChange }: AuthTabsProps) => {
  return (
    <div className="flex w-full rounded-xl bg-secondary/80 p-1.5 border border-white/[0.06]">
      <button
        onClick={() => onTabChange("signin")}
        className={cn(
          "flex-1 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200",
          activeTab === "signin"
            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
        )}
      >
        Sign In
      </button>
      <button
        onClick={() => onTabChange("signup")}
        className={cn(
          "flex-1 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200",
          activeTab === "signup"
            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
        )}
      >
        Sign Up
      </button>
    </div>
  );
};